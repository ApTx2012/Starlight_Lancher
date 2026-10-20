use futures::{Stream, StreamExt};
use serde::{Deserialize, Serialize};
use std::{
    future::Future,
    sync::{Arc, LazyLock, Mutex},
};
use tokio::sync::watch;

#[derive(
    Clone, Copy, Debug, Default, Deserialize, Serialize, Hash, PartialEq, Eq,
)]
#[serde(rename_all = "snake_case")]
pub enum HostedTaskState {
    #[default]
    Running,
    Paused,
    Canceling,
    Canceled,
    Failed,
    Finalizing,
}

static CONTROLS: LazyLock<dashmap::DashMap<String, Arc<Control>>> =
    LazyLock::new(dashmap::DashMap::new);

pub(super) struct Control {
    instance_id: String,
    state: Mutex<HostedTaskState>,
    changes: watch::Sender<HostedTaskState>,
}

fn stopped() -> crate::Error {
    super::invalid("已停止整合包下载；已下载的缓存会保留，可重试继续")
}

impl Control {
    fn new(instance_id: &str) -> Self {
        Self {
            instance_id: instance_id.to_owned(),
            state: Mutex::new(HostedTaskState::Running),
            changes: watch::channel(HostedTaskState::Running).0,
        }
    }

    fn state(&self) -> HostedTaskState {
        *self.state.lock().unwrap_or_else(|error| error.into_inner())
    }

    fn transition(
        &self,
        allowed: &[HostedTaskState],
        next: HostedTaskState,
    ) -> crate::Result<()> {
        let mut state =
            self.state.lock().unwrap_or_else(|error| error.into_inner());
        if !allowed.contains(&state) {
            return Err(super::invalid(
                "任务状态已变化或正在应用安装文件，当前操作不可用",
            ));
        }
        *state = next;
        // Publish under the transition lock, so a late pause cannot overwrite finalization.
        crate::event::emit::set_hosted_loading_state(&self.instance_id, next);
        self.changes.send_replace(next);
        Ok(())
    }

    fn pause(&self) -> crate::Result<()> {
        self.transition(&[HostedTaskState::Running], HostedTaskState::Paused)
    }

    fn resume(&self) -> crate::Result<()> {
        self.transition(&[HostedTaskState::Paused], HostedTaskState::Running)
    }

    fn cancel(&self) -> crate::Result<()> {
        self.transition(
            &[HostedTaskState::Running, HostedTaskState::Paused],
            HostedTaskState::Canceling,
        )
    }

    pub(super) fn begin_finalizing(&self) -> crate::Result<()> {
        self.transition(
            &[HostedTaskState::Running],
            HostedTaskState::Finalizing,
        )
    }

    /// The operation may be dropped only before begin_finalizing. Restarting
    /// re-plans from verified cache objects and the downloader's partial files.
    pub(super) async fn run<T, F, Fut>(
        &self,
        mut operation: F,
    ) -> crate::Result<T>
    where
        F: FnMut() -> Fut,
        Fut: Future<Output = crate::Result<T>>,
    {
        let mut changes = self.changes.subscribe();
        loop {
            let state = *changes.borrow_and_update();
            match state {
                HostedTaskState::Paused => {
                    changes.changed().await.map_err(|_| stopped())?;
                    continue;
                }
                HostedTaskState::Canceling => return Err(stopped()),
                _ => {}
            }
            let work = operation();
            tokio::pin!(work);
            loop {
                tokio::select! {
                    biased;
                    changed = changes.changed() => {
                        changed.map_err(|_| stopped())?;
                        match self.state() {
                            HostedTaskState::Paused => break,
                            HostedTaskState::Canceling => return Err(stopped()),
                            _ => {},
                        }
                    }
                    result = &mut work => {
                        match self.state() {
                            HostedTaskState::Paused => break,
                            HostedTaskState::Canceling => return Err(stopped()),
                            _ => return result,
                        }
                    }
                }
            }
        }
    }
}

pub(super) struct Registration {
    instance_id: String,
    pub(super) control: Arc<Control>,
}

impl Registration {
    pub(super) fn new(instance_id: &str) -> crate::Result<Self> {
        use dashmap::mapref::entry::Entry;
        let control = Arc::new(Control::new(instance_id));
        match CONTROLS.entry(instance_id.to_owned()) {
            Entry::Occupied(_) => {
                return Err(super::invalid("此实例已有整合包下载任务"));
            }
            Entry::Vacant(entry) => {
                entry.insert(control.clone());
            }
        }
        Ok(Self {
            instance_id: instance_id.to_owned(),
            control,
        })
    }
}

impl Drop for Registration {
    fn drop(&mut self) {
        CONTROLS.remove_if(&self.instance_id, |_, value| {
            Arc::ptr_eq(value, &self.control)
        });
    }
}

fn lookup(instance_id: &str) -> crate::Result<Arc<Control>> {
    CONTROLS
        .get(instance_id)
        .map(|entry| entry.value().clone())
        .ok_or_else(|| super::invalid("整合包下载任务已结束，请重试"))
}

pub async fn pause(instance_id: &str) -> crate::Result<()> {
    lookup(instance_id)?.pause()
}
pub async fn resume(instance_id: &str) -> crate::Result<()> {
    lookup(instance_id)?.resume()
}
pub async fn cancel(instance_id: &str) -> crate::Result<()> {
    lookup(instance_id)?.cancel()
}

/// Stop the batch on its first error so stalled peers cannot hide failure.
pub(super) async fn collect_downloads<S>(downloads: S) -> crate::Result<u64>
where
    S: Stream<Item = crate::Result<u64>>,
{
    tokio::pin!(downloads);
    let mut total = 0;
    while let Some(result) = downloads.next().await {
        total += result?;
    }
    Ok(total)
}

#[cfg(test)]
mod tests {
    use super::*;
    use futures::FutureExt;
    use std::sync::{
        Arc,
        atomic::{AtomicUsize, Ordering},
    };
    use tokio::sync::{Notify, Semaphore};

    struct TransferGuard(Arc<AtomicUsize>, Arc<Notify>);

    impl Drop for TransferGuard {
        fn drop(&mut self) {
            self.0.fetch_add(1, Ordering::SeqCst);
            self.1.notify_one();
        }
    }

    #[tokio::test]
    async fn pause_drops_live_transfers_and_resume_restarts_before_stop() {
        let control = Arc::new(Control::new("pause-resume-test"));
        let starts = Arc::new(Semaphore::new(0));
        let drops = Arc::new(AtomicUsize::new(0));
        let dropped = Arc::new(Notify::new());
        let task = {
            let control = control.clone();
            let starts = starts.clone();
            let drops = drops.clone();
            let dropped = dropped.clone();
            tokio::spawn(async move {
                control
                    .run(|| {
                        let guard =
                            TransferGuard(drops.clone(), dropped.clone());
                        starts.add_permits(1);
                        async move {
                            let _guard = guard;
                            std::future::pending::<crate::Result<()>>().await
                        }
                    })
                    .await
            })
        };
        starts.acquire().await.unwrap().forget();
        control.pause().unwrap();
        dropped.notified().await;
        assert_eq!(drops.load(Ordering::SeqCst), 1);
        assert_eq!(control.state(), HostedTaskState::Paused);
        control.resume().unwrap();
        starts.acquire().await.unwrap().forget();
        control.cancel().unwrap();
        let result = task.await.unwrap();
        assert!(result.unwrap_err().to_string().contains("停止"));
        assert_eq!(drops.load(Ordering::SeqCst), 2);
    }

    #[tokio::test]
    async fn stopping_an_already_paused_task_never_starts_a_transfer() {
        let control = Arc::new(Control::new("paused-stop-test"));
        control.pause().unwrap();
        let task = {
            let control = control.clone();
            tokio::spawn(async move {
                control
                    .run(|| async {
                        panic!("paused work was polled");
                        Ok::<(), crate::Error>(())
                    })
                    .await
            })
        };
        control.cancel().unwrap();
        assert!(task.await.unwrap().is_err());
    }

    #[test]
    fn finalization_rejects_pause_and_stop() {
        let control = Control::new("finalization-test");
        control.begin_finalizing().unwrap();
        assert_eq!(control.state(), HostedTaskState::Finalizing);
        assert!(control.pause().is_err());
        assert!(control.cancel().is_err());
    }

    #[test]
    fn pause_and_finalization_have_only_one_winner() {
        for _ in 0..32 {
            let control = Arc::new(Control::new("finalization-race-test"));
            let barrier = Arc::new(std::sync::Barrier::new(2));
            let task = {
                let control = control.clone();
                let barrier = barrier.clone();
                std::thread::spawn(move || {
                    barrier.wait();
                    control.pause().is_ok()
                })
            };
            barrier.wait();
            let finalized = control.begin_finalizing().is_ok();
            assert_ne!(finalized, task.join().unwrap());
        }
    }

    #[tokio::test]
    async fn first_failure_drops_stalled_peer_downloads() {
        let drops = Arc::new(AtomicUsize::new(0));
        let guard = TransferGuard(drops.clone(), Arc::new(Notify::new()));
        let downloads = futures::stream::iter(vec![
            async move {
                let _guard = guard;
                std::future::pending::<crate::Result<u64>>().await
            }
            .boxed(),
            async { Err(super::super::invalid("failed file")) }.boxed(),
        ])
        .buffer_unordered(2);
        let result = collect_downloads(downloads).await;
        assert!(result.unwrap_err().to_string().contains("failed file"));
        assert_eq!(drops.load(Ordering::SeqCst), 1);
    }

    #[test]
    fn registration_is_unique_and_released_on_drop() {
        let id = uuid::Uuid::new_v4().to_string();
        let registration = Registration::new(&id).unwrap();
        assert!(Registration::new(&id).is_err());
        drop(registration);
        assert!(Registration::new(&id).is_ok());
    }
}
