use reqwest::{Client, Response, header};

pub(super) async fn metadata_request(
    client: &Client,
    url: &str,
    auth: &str,
) -> Result<Response, reqwest::Error> {
    client
        .get(url)
        .query(&[("starlight_request", uuid::Uuid::new_v4().to_string())])
        .header(header::AUTHORIZATION, auth)
        .header(header::CACHE_CONTROL, "no-cache, no-store")
        .header(header::PRAGMA, "no-cache")
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await
}

async fn bounded_json(mut response: Response) -> Option<serde_json::Value> {
    let mut bytes = Vec::new();
    while let Some(chunk) = response.chunk().await.ok()? {
        if bytes.len() + chunk.len() > 16_384 {
            return None;
        }
        bytes.extend_from_slice(&chunk);
    }
    serde_json::from_slice(&bytes).ok()
}

pub(super) async fn response_failure(
    client: &Client,
    response: Response,
    user_url: &str,
    suffix: &str,
    auth: &str,
) -> String {
    let status = response.status().as_u16();
    let trace = response
        .headers()
        .get("eo-log-uuid")
        .and_then(|value| value.to_str().ok())
        .filter(|value| {
            !value.is_empty()
                && value.len() <= 128
                && value
                    .bytes()
                    .all(|c| c.is_ascii_alphanumeric() || c == b'-')
        })
        .map(|value| format!("；CDN 请求编号 {value}"))
        .unwrap_or_default();
    let context = format!("（整合包 HTTP {status}；接口 {suffix}{trace}）");
    if let Some(body) = bounded_json(response).await {
        if let Some(message) = body["errorMessage"]
            .as_str()
            .filter(|s| !s.trim().is_empty())
        {
            let token = auth.strip_prefix("Bearer ").unwrap_or(auth);
            let message = if token.is_empty() {
                message.to_owned()
            } else {
                message.replace(token, "[凭据已隐藏]")
            };
            let message: String = message
                .chars()
                .filter(|c| !c.is_control())
                .take(500)
                .collect();
            return format!("StarLight 服务端返回：{message}{context}");
        }
    }
    if !matches!(status, 401 | 403) {
        return format!("StarLight 服务端请求失败{context}");
    }
    let detail = match metadata_request(client, user_url, auth).await {
        Ok(user_response) => {
            let user_status = user_response.status().as_u16();
            if user_status == 200 {
                let valid_user =
                    bounded_json(user_response).await.is_some_and(|body| {
                        body["payload"]["uuid"]
                            .as_str()
                            .is_some_and(|id| !id.is_empty())
                            && body["payload"]["username"].is_string()
                    });
                if valid_user {
                    "皮肤站登录有效，但整合包接口返回错误，且没有提供具体原因。请用请求编号查询服务端或 CDN 日志".to_owned()
                } else {
                    "整合包接口拒绝访问，用户接口返回内容异常，无法确认登录状态"
                        .to_owned()
                }
            } else if matches!(user_status, 401 | 403) {
                format!(
                    "整合包和用户接口均拒绝登录凭据（用户接口 HTTP {user_status}）。请重新登录；若仍失败，请检查服务端鉴权及 CDN 配置"
                )
            } else {
                format!(
                    "整合包接口拒绝访问，暂时无法复核登录状态（用户接口 HTTP {user_status}）"
                )
            }
        }
        Err(_) => "整合包接口拒绝访问，用户接口连接失败，暂时无法复核登录状态"
            .to_owned(),
    };
    format!("{detail}{context}")
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};

    #[tokio::test]
    async fn hosted_auth_failure_verifies_same_credential_without_exposing_it()
    {
        for (pack_status, user_status, body, expected) in [
            (
                401,
                200,
                r#"{"payload":{"uuid":"owner","username":"Player"}}"#,
                "皮肤站登录有效",
            ),
            (403, 401, "{}", "均拒绝登录凭据"),
            (401, 200, "<html>Proxy error</html>", "用户接口返回内容异常"),
        ] {
            let listener =
                tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
            let base = format!("http://{}", listener.local_addr().unwrap());
            let server = tokio::spawn(async move {
                let mut requests = Vec::new();
                for (status, body) in [(pack_status, ""), (user_status, body)] {
                    let (mut socket, _) = listener.accept().await.unwrap();
                    let mut request = Vec::new();
                    while !request.ends_with(b"\r\n\r\n") {
                        request.push(socket.read_u8().await.unwrap());
                    }
                    requests.push(String::from_utf8(request).unwrap());
                    let response = format!(
                        "HTTP/1.1 {status} Test\r\nContent-Length: {}\r\nEO-LOG-UUID: trace-123\r\nConnection: close\r\n\r\n{body}",
                        body.len()
                    );
                    socket.write_all(response.as_bytes()).await.unwrap();
                }
                requests
            });
            let client = Client::builder().no_proxy().build().unwrap();
            let auth = "Bearer test-secret-never-display";
            let response =
                metadata_request(&client, &format!("{base}/default"), auth)
                    .await
                    .unwrap();
            let message = response_failure(
                &client,
                response,
                &format!("{base}/user"),
                "/default",
                auth,
            )
            .await;
            assert!(message.contains(expected), "{message}");
            assert!(message.contains(&format!("整合包 HTTP {pack_status}")));
            assert!(message.contains("trace-123"));
            assert!(!message.contains("test-secret"));
            let requests = server.await.unwrap();
            for (request, path) in requests.iter().zip(["/default", "/user"]) {
                assert!(
                    request
                        .starts_with(&format!("GET {path}?starlight_request="))
                );
                let headers = request.to_ascii_lowercase();
                assert!(headers.contains(
                    "authorization: bearer test-secret-never-display\r\n"
                ));
                assert!(
                    headers.contains("cache-control: no-cache, no-store\r\n")
                );
            }
        }
    }

    #[tokio::test]
    async fn hosted_business_errors_preserve_server_reason_without_login_probe()
    {
        for status in [400, 403, 409, 500] {
            let listener =
                tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
            let base = format!("http://{}", listener.local_addr().unwrap());
            let server = tokio::spawn(async move {
                let (mut socket, _) = listener.accept().await.unwrap();
                let mut request = Vec::new();
                while !request.ends_with(b"\r\n\r\n") {
                    request.push(socket.read_u8().await.unwrap());
                }
                let body = r#"{"error":"IllegalState","errorMessage":"整合包 Mod 标签已删除，请管理员重新设置 test-secret-never-display"}"#;
                let response = format!(
                    "HTTP/1.1 {status} Test\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
                    body.len()
                );
                socket.write_all(response.as_bytes()).await.unwrap();
            });
            let client = Client::builder().no_proxy().build().unwrap();
            let auth = "Bearer test-secret-never-display";
            let response = metadata_request(
                &client,
                &format!("{base}/tagged-mods/2"),
                auth,
            )
            .await
            .unwrap();
            let message = response_failure(
                &client,
                response,
                &format!("{base}/user"),
                "/tagged-mods/2",
                auth,
            )
            .await;
            assert!(
                message.contains("整合包 Mod 标签已删除，请管理员重新设置"),
                "{message}"
            );
            assert!(message.contains("/tagged-mods/2"));
            assert!(message.contains(&format!("HTTP {status}")));
            assert!(!message.contains("test-secret"));
            assert!(!message.contains("请重新登录"));
            server.await.unwrap();
        }
    }
}
