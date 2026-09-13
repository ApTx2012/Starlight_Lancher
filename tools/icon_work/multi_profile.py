p = r"D:\Project\Starlight_Lancher\packages\app-lib\src\state\minecraft_auth\yggdrasil.rs"
t = open(p, encoding="utf-8").read()

# 定位：把 201-265 的整段逻辑替换成"遍历所有 profiles"
old = """    if let Some(profile) = response.selected_profile {
        let credentials = create_credentials(
            profile,
            response.access_token,
            response.client_token,
            metadata,
            login,
        );
        credentials.upsert(exec).await?;
        return Ok(YggdrasilLoginResult::Complete { credentials });
    }

    if response.available_profiles.is_empty() {
        return Err(ErrorKind::OtherError(
            "The Yggdrasil account does not have a Minecraft profile"
                .to_string(),
        )
        .as_error());
    }

    if response.available_profiles.len() == 1 {
        let profile = response.available_profiles[0].clone();
        let refreshed = refresh_selected_profile(
            &metadata.api_root,
            &response.access_token,
            &response.client_token,
            &profile,
        )
        .await?;
        let selected_profile = refreshed.selected_profile.ok_or_else(|| {
            ErrorKind::OtherError(
                "The Yggdrasil service did not select the requested profile"
                    .to_string(),
            )
            .as_error()
        })?;
        let credentials = create_credentials(
            selected_profile,
            refreshed.access_token,
            refreshed.client_token,
            metadata,
            login,
        );
        credentials.upsert(exec).await?;
        return Ok(YggdrasilLoginResult::Complete { credentials });
    }

    let flow_id = Uuid::new_v4();
    let profiles = response.available_profiles.clone();
    let mut pending = PENDING_LOGINS.lock().await;
    pending.retain(|_, login| login.created.elapsed() < PENDING_LOGIN_LIFETIME);
    pending.insert(
        flow_id,
        PendingYggdrasilLogin {
            created: Instant::now(),
            api_root: metadata.api_root,
            server_name: metadata.server_name,
            login: login.to_string(),
            access_token: response.access_token,
            client_token: response.client_token,
            profiles: response.available_profiles,
        },
    );

    Ok(YggdrasilLoginResult::SelectProfile { flow_id, profiles })"""

new = """    // 收集本次登录可用的所有角色；优先使用 availableProfiles，回退到 selectedProfile。
    let mut profiles: Vec<YggdrasilProfile> = response.available_profiles.clone();
    if profiles.is_empty() {
        if let Some(selected) = response.selected_profile.clone() {
            profiles.push(selected);
        }
    }
    if profiles.is_empty() {
        return Err(ErrorKind::OtherError(
            "The Yggdrasil account does not have a Minecraft profile"
                .to_string(),
        )
        .as_error());
    }

    // 逐个角色 refresh + 保存，实现「一次登录自动加入所有角色」。
    // Yggdrasil 同一时刻只激活一个角色，因此需要串行 refresh，并各自保存当次 token。
    let mut access_token = response.access_token.clone();
    let mut client_token = response.client_token.clone();
    let mut last_credentials: Option<Credentials> = None;

    for (index, profile) in profiles.iter().enumerate() {
        let refreshed = refresh_selected_profile(
            &metadata.api_root,
            &access_token,
            &client_token,
            profile,
        )
        .await?;
        let selected_profile = refreshed.selected_profile.ok_or_else(|| {
            ErrorKind::OtherError(
                "The Yggdrasil service did not select the requested profile"
                    .to_string(),
            )
            .as_error()
        })?;
        access_token = refreshed.access_token.clone();
        client_token = refreshed.client_token.clone();

        let mut credentials = create_credentials(
            selected_profile,
            refreshed.access_token,
            refreshed.client_token,
            YggdrasilMetadata {
                api_root: metadata.api_root.clone(),
                server_name: metadata.server_name.clone(),
                raw: String::new(),
            },
            login,
        );
        // 仅让最后一个（通常是默认/首个以外的角色）保持 active，避免多个 active。
        credentials.active = index == profiles.len() - 1;
        credentials.upsert(exec).await?;
        last_credentials = Some(credentials);
    }

    if let Some(credentials) = last_credentials {
        return Ok(YggdrasilLoginResult::Complete { credentials });
    }

    Err(ErrorKind::OtherError(
        "The Yggdrasil account does not have a Minecraft profile"
            .to_string(),
    )
    .as_error())"""

assert old in t, "找不到要替换的登录逻辑块"
t = t.replace(old, new, 1)

open(p, "w", encoding="utf-8", newline="\n").write(t)
print("done")