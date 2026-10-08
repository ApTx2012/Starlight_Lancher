//! Logical stream budgets for shared native HTTP/2 connections.
//!
//! HTTP/2 streams share one physical connection per authority, so they must
//! not consume the HTTP/1 connection permits held by `native_budget`.

use crate::util::fetch::{DownloadRoute, ProxyPolicy};
use parking_lot::Mutex;
use std::collections::HashMap;
use std::sync::{Arc, LazyLock};
use tokio::sync::{AcquireError, OwnedSemaphorePermit, Semaphore};
use tokio::time::{Duration, sleep};

const MAX_H2_STREAMS: usize = 128;
const MAX_H2_STREAMS_PER_AUTHORITY: usize = 32;
const MAX_ASSET_H2_STREAMS: usize = 96;
const MAX_ASSET_H2_STREAMS_PER_AUTHORITY: usize = 24;

#[derive(Clone, Debug, Eq, Hash, PartialEq)]
struct AuthorityKey {
    authority: String,
    proxy: ProxyPolicy,
}

static AUTHORITY_BUDGETS: LazyLock<
    Mutex<HashMap<AuthorityKey, Arc<Semaphore>>>,
> = LazyLock::new(|| Mutex::new(HashMap::new()));
static GLOBAL_BUDGET: LazyLock<Arc<Semaphore>> =
    LazyLock::new(|| Arc::new(Semaphore::new(MAX_H2_STREAMS)));
static ASSET_AUTHORITY_BUDGETS: LazyLock<
    Mutex<HashMap<AuthorityKey, Arc<Semaphore>>>,
> = LazyLock::new(|| Mutex::new(HashMap::new()));
static ASSET_GLOBAL_BUDGET: LazyLock<Arc<Semaphore>> =
    LazyLock::new(|| Arc::new(Semaphore::new(MAX_ASSET_H2_STREAMS)));

pub(crate) struct H2StreamPermit {
    _global: OwnedSemaphorePermit,
    _authority: Option<OwnedSemaphorePermit>,
}

fn budget(route: &DownloadRoute) -> Option<Arc<Semaphore>> {
    let authority = crate::util::fetch::url_authority(&route.url)?;
    let key = AuthorityKey {
        authority,
        proxy: route.proxy,
    };
    let mut budgets = AUTHORITY_BUDGETS.lock();
    if budgets.len() >= 256 {
        budgets.retain(|_, budget| Arc::strong_count(budget) > 1);
    }
    Some(
        budgets
            .entry(key)
            .or_insert_with(|| {
                Arc::new(Semaphore::new(MAX_H2_STREAMS_PER_AUTHORITY))
            })
            .clone(),
    )
}

fn asset_budget(route: &DownloadRoute) -> Option<Arc<Semaphore>> {
    let authority = crate::util::fetch::url_authority(&route.url)?;
    let key = AuthorityKey {
        authority,
        proxy: route.proxy,
    };
    let mut budgets = ASSET_AUTHORITY_BUDGETS.lock();
    if budgets.len() >= 256 {
        budgets.retain(|_, budget| Arc::strong_count(budget) > 1);
    }
    Some(
        budgets
            .entry(key)
            .or_insert_with(|| {
                Arc::new(Semaphore::new(MAX_ASSET_H2_STREAMS_PER_AUTHORITY))
            })
            .clone(),
    )
}

pub(crate) async fn acquire(
    route: &DownloadRoute,
) -> Result<H2StreamPermit, AcquireError> {
    let authority_budget = budget(route);
    loop {
        let global = Arc::clone(&GLOBAL_BUDGET).acquire_owned().await?;
        let authority = match authority_budget.as_ref() {
            Some(budget) => match Arc::clone(budget).try_acquire_owned() {
                Ok(permit) => Some(permit),
                Err(tokio::sync::TryAcquireError::NoPermits) => {
                    drop(global);
                    sleep(Duration::from_millis(5)).await;
                    continue;
                }
                Err(tokio::sync::TryAcquireError::Closed) => {
                    unreachable!("H2 authority budgets are never closed")
                }
            },
            None => None,
        };
        return Ok(H2StreamPermit {
            _global: global,
            _authority: authority,
        });
    }
}

pub(crate) async fn acquire_with_pressure(
    route: &DownloadRoute,
) -> crate::Result<H2StreamPermit> {
    crate::util::fetch::wait_for_download_resource(acquire(route))
        .await
        .map_err(|_| {
            crate::Error::from(crate::ErrorKind::NetworkError(
                "HTTP/2 stream permit remained stalled for 5 minutes"
                    .to_string(),
            ))
        })?
        .map_err(Into::into)
}

/// Acquires a stream for the Minecraft asset batch. Assets retain a large
/// logical worker window, but use a separate physical stream pool so they
/// cannot consume the ordinary native content share.
pub(crate) async fn acquire_asset(
    route: &DownloadRoute,
) -> Result<H2StreamPermit, AcquireError> {
    let authority_budget = asset_budget(route);
    loop {
        let global = Arc::clone(&ASSET_GLOBAL_BUDGET).acquire_owned().await?;
        let authority = match authority_budget.as_ref() {
            Some(budget) => match Arc::clone(budget).try_acquire_owned() {
                Ok(permit) => Some(permit),
                Err(tokio::sync::TryAcquireError::NoPermits) => {
                    drop(global);
                    sleep(Duration::from_millis(5)).await;
                    continue;
                }
                Err(tokio::sync::TryAcquireError::Closed) => {
                    unreachable!("asset authority budgets are never closed")
                }
            },
            None => None,
        };
        return Ok(H2StreamPermit {
            _global: global,
            _authority: authority,
        });
    }
}

pub(crate) async fn acquire_asset_with_pressure(
    route: &DownloadRoute,
) -> crate::Result<H2StreamPermit> {
    crate::util::fetch::wait_for_download_resource(acquire_asset(route))
        .await
        .map_err(|_| {
            crate::Error::from(crate::ErrorKind::NetworkError(
                "asset HTTP/2 stream permit remained stalled for 5 minutes"
                    .to_string(),
            ))
        })?
        .map_err(Into::into)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::util::fetch::DownloadRouteSource;
    use std::sync::atomic::{AtomicUsize, Ordering};

    fn route() -> DownloadRoute {
        DownloadRoute {
            url: "https://h2-budget.example/file".to_string(),
            source: DownloadRouteSource::Official,
            is_mirror: false,
            allow_sensitive_headers: true,
            supports_range: true,
            proxy: ProxyPolicy::Direct,
        }
    }

    #[tokio::test]
    async fn authority_stream_budget_is_independent_from_connection_budget() {
        let route = route();
        let mut permits = Vec::new();
        for _ in 0..MAX_H2_STREAMS_PER_AUTHORITY {
            permits.push(acquire(&route).await.unwrap());
        }
        assert_eq!(budget(&route).unwrap().available_permits(), 0,);
        drop(permits);
        assert_eq!(
            budget(&route).unwrap().available_permits(),
            MAX_H2_STREAMS_PER_AUTHORITY,
        );
    }

    #[tokio::test]
    async fn asset_stream_budget_is_separate_and_bounded() {
        let route = DownloadRoute {
            url: "https://asset-h2-budget.example/file".to_string(),
            source: DownloadRouteSource::Bmclapi,
            is_mirror: true,
            allow_sensitive_headers: false,
            supports_range: true,
            proxy: ProxyPolicy::Direct,
        };
        let mut permits = Vec::new();
        for _ in 0..MAX_ASSET_H2_STREAMS_PER_AUTHORITY {
            permits.push(acquire_asset(&route).await.unwrap());
        }
        assert_eq!(asset_budget(&route).unwrap().available_permits(), 0,);
        drop(permits);
        assert_eq!(
            asset_budget(&route).unwrap().available_permits(),
            MAX_ASSET_H2_STREAMS_PER_AUTHORITY,
        );
        assert_eq!(
            budget(&route).unwrap().available_permits(),
            MAX_H2_STREAMS_PER_AUTHORITY
        );
    }

    #[tokio::test]
    async fn contended_stream_wait_reports_pressure_and_resumes() {
        let route = DownloadRoute {
            url: "https://h2-pressure.example/file".to_string(),
            source: DownloadRouteSource::Official,
            is_mirror: false,
            allow_sensitive_headers: true,
            supports_range: true,
            proxy: ProxyPolicy::Direct,
        };
        let mut held = Vec::new();
        for _ in 0..MAX_H2_STREAMS_PER_AUTHORITY {
            held.push(acquire(&route).await.unwrap());
        }
        let pressure = Arc::new(AtomicUsize::new(0));
        let observed = Arc::clone(&pressure);
        let release = tokio::spawn(async move {
            tokio::time::sleep(Duration::from_millis(35)).await;
            drop(held);
        });

        let permit = crate::util::fetch::wait_for_resource_with_pressure(
            acquire(&route),
            Duration::from_millis(5),
            Duration::from_millis(100),
            move || {
                observed.fetch_add(1, Ordering::Relaxed);
            },
        )
        .await;

        release.await.unwrap();
        assert!(permit.is_ok());
        assert!(pressure.load(Ordering::Relaxed) >= 1);
    }
}
