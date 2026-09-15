use crate::event::{
    LoadingBarId, LoadingBarType,
    emit::{fail_hosted_loading, init_loading, set_loading},
};
use std::{
    sync::Mutex,
    time::{Duration, Instant},
};

pub(super) struct PackProgress {
    bar: LoadingBarId,
    last_update: Mutex<Instant>,
}

#[cfg(all(test, not(feature = "tauri")))]
mod tests {
    use super::*;

    #[tokio::test]
    async fn phases_and_failure_remain_in_snapshots_until_the_task_ends() {
        let state = crate::EventState::init().await.unwrap();
        let progress = PackProgress::new("progress-test", "Test pack")
            .await
            .unwrap();
        let snapshot = || {
            state.loading_bars.iter().find(|bar| matches!(&bar.bar_type,
            LoadingBarType::HostedPackSync { instance_id, .. } if instance_id == "progress-test"
        )).map(|bar| bar.value().clone()).unwrap()
        };
        assert_eq!(snapshot().total, 0.0);
        progress.download(524_288, 1_048_576, "mods/example.jar", true);
        assert_eq!(snapshot().current / snapshot().total, 0.5);
        assert!(snapshot().message.contains("0.5 / 1.0 MiB"));
        progress.download(1_048_576, 1_048_576, "mods/example.jar", true);
        assert_eq!(snapshot().current, snapshot().total);
        progress.download(262_144, 1_048_576, "mods/example.jar", true);
        assert_eq!(snapshot().current / snapshot().total, 0.25);
        progress.update(0, 0, "正在应用更新", true);
        assert_eq!(snapshot().message, "正在应用更新");
        assert_eq!(snapshot().total, 0.0);
        progress.fail(
            &crate::ErrorKind::InputError("download failed".into()).as_error(),
        );
        assert!(matches!(
            snapshot().bar_type,
            LoadingBarType::HostedPackSync { error: Some(_), .. }
        ));
        let id = snapshot().loading_bar_uuid;
        drop(progress);
        tokio::task::yield_now().await;
        assert!(!state.loading_bars.contains_key(&id));
    }
}

impl PackProgress {
    pub async fn new(instance_id: &str, name: &str) -> crate::Result<Self> {
        let bar = init_loading(
            LoadingBarType::HostedPackSync {
                instance_id: instance_id.to_owned(),
                instance_name: name.to_owned(),
                error: None,
            },
            1.0,
            "正在获取整合包信息",
        )
        .await?;
        let progress = Self {
            bar,
            last_update: Mutex::new(Instant::now()),
        };
        progress.update(0, 0, "正在获取整合包信息", true);
        Ok(progress)
    }

    pub fn update(&self, current: u64, total: u64, message: &str, force: bool) {
        let mut last = self.last_update.lock().unwrap();
        if !force && last.elapsed() < Duration::from_millis(200) {
            return;
        }
        *last = Instant::now();
        let _ = set_loading(&self.bar, current, total, message);
    }

    pub fn download(&self, current: u64, total: u64, file: &str, force: bool) {
        self.update(
            current,
            total,
            &format!(
                "正在下载 · {:.1} / {:.1} MiB · {file}",
                current as f64 / 1_048_576.0,
                total as f64 / 1_048_576.0
            ),
            force,
        );
    }

    pub fn install(&self, job: &crate::install::InstallJobSnapshot) {
        use crate::install::InstallPhaseId::*;
        let message = match job.phase {
            PreparingJava => "正在准备 Java",
            DownloadingMinecraft => "正在下载游戏组件",
            ResolvingLoader | RunningLoaderProcessors | UpdatingLoader => {
                "正在安装加载器"
            }
            Verifying => "正在校验游戏组件",
            Finalizing | Completed => "正在完成游戏组件安装",
            _ => "正在安装游戏组件",
        };
        let (current, total) = job
            .progress
            .as_ref()
            .map(|p| (p.current, p.total))
            .unwrap_or((0, 0));
        let message = if let Some(bytes) = job.summary.bytes_total {
            format!(
                "{message} · {:.1} / {:.1} MiB",
                job.summary.bytes_downloaded as f64 / 1_048_576.0,
                bytes as f64 / 1_048_576.0
            )
        } else {
            message.to_owned()
        };
        self.update(current, total, &message, false);
    }

    pub fn fail(&self, error: &crate::Error) {
        fail_hosted_loading(&self.bar, &error.user_facing_message());
    }
}
