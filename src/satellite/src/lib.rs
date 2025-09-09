use candid::Nat;
use candid::Principal;

use ic_cdk::api::management_canister::http_request::{
    http_request as http_request_outcall, CanisterHttpRequestArgument, HttpHeader, HttpMethod,
};
use junobuild_macros::on_set_doc;
use junobuild_satellite::{get_doc_store, include_satellite, OnSetDocContext};
use junobuild_utils::decode_doc_data;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
struct EmailRequest {
    from: String,
    to: String,
    subject: String,
    text: String,
    user_name: String,
    recipient_name: String,
}

#[derive(Serialize, Deserialize)]
struct EmailPayload {
    from: String,
    to: String,
    subject: String,
    text: String,
}

#[derive(Serialize, Deserialize)]
struct EnvVars {
    NOTIFICATIONS_TOKEN: String,
}

fn get_notifications_token() -> Result<String, String> {
    let prod_id = "xX_CHt9f1p35fO6a75snN"; // production doc id
    let dev_id = "-emAGTKnxk_4IUG4ycgs6"; // development doc id

    // Attempt to get prod doc
    match get_doc_store(
        ic_cdk::caller(),
        "ENV_VARS".to_string(),
        prod_id.to_string(),
    ) {
        Ok(Some(doc)) => {
            ic_cdk::println!("📄 Prod ENV_VARS doc found: {:?}", doc);
            match decode_doc_data::<EnvVars>(&doc.data) {
                Ok(env) => {
                    ic_cdk::println!("✅ Decoded prod ENV_VARS: {:?}", env);
                    Ok(env.NOTIFICATIONS_TOKEN)
                }
                Err(e) => {
                    ic_cdk::println!("❌ Failed to decode prod ENV_VARS: {}", e);
                    Err(format!("Failed to decode prod ENV_VARS: {}", e))
                }
            }
        }
        Ok(None) => {
            ic_cdk::println!("⚠️ Prod ENV_VARS doc not found, falling back to dev...");
            match get_doc_store(ic_cdk::caller(), "ENV_VARS".to_string(), dev_id.to_string()) {
                Ok(Some(doc)) => {
                    ic_cdk::println!("📄 Dev ENV_VARS doc found: {:?}", doc);
                    match decode_doc_data::<EnvVars>(&doc.data) {
                        Ok(env) => {
                            ic_cdk::println!("✅ Decoded dev ENV_VARS: {:?}", env);
                            Ok(env.NOTIFICATIONS_TOKEN)
                        }
                        Err(e) => {
                            ic_cdk::println!("❌ Failed to decode dev ENV_VARS: {}", e);
                            Err(format!("Failed to decode dev ENV_VARS: {}", e))
                        }
                    }
                }
                Ok(None) => Err("No dev ENV_VARS found".to_string()),
                Err(e) => Err(format!("Failed to retrieve dev ENV_VARS: {:?}", e)),
            }
        }
        Err(e) => Err(format!("Failed to retrieve prod ENV_VARS: {:?}", e)),
    }
}

#[on_set_doc(collections = ["email_requests"])]
async fn on_set_doc(context: OnSetDocContext) -> Result<(), String> {
    ic_cdk::println!(
        "📧 Email function triggered for document key: {}",
        context.data.key
    );

    let email_data: EmailRequest =
        match decode_doc_data::<EmailRequest>(&context.data.data.after.data) {
            Ok(data) => {
                ic_cdk::println!(
                    "✅ Successfully decoded email data for: {} -> {}",
                    data.user_name,
                    data.recipient_name
                );
                data
            }
            Err(e) => {
                ic_cdk::println!("❌ Failed to decode email data: {}", e);
                return Err(format!("Failed to decode email data: {}", e));
            }
        };

    let email_payload = EmailPayload {
        from: email_data.from.clone(),
        to: email_data.to.clone(),
        subject: email_data.subject.clone(),
        text: format!(
            "Hello {},\n\n{} has shared some files with you through Futura.\n\nYou can access your shared files at: https://futura.now\n\nBest regards,\nThe Futura Team",
            email_data.recipient_name,
            email_data.user_name
        ),
    };

    ic_cdk::print(format!(
        "Email payload created - From: {}, To: {}, Subject: {}",
        email_payload.from, email_payload.to, email_payload.subject
    ));

    let json_body = match serde_json::to_string(&email_payload) {
        Ok(json) => {
            ic_cdk::print(format!(
                "Email payload serialized successfully, length: {} bytes",
                json.len()
            ));
            json
        }
        Err(e) => {
            let error_msg = format!("Failed to serialize email payload: {}", e);
            ic_cdk::print(error_msg.clone());
            return Err(error_msg);
        }
    };

    let auth_token = match get_notifications_token() {
        Ok(token) => token,
        Err(e) => {
            ic_cdk::println!("❌ Could not fetch NOTIFICATIONS_TOKEN: {}", e);
            return Err(e);
        }
    };
    ic_cdk::print(format!(
        "Auth token present: {}",
        if auth_token.is_empty() { "NO" } else { "YES" }
    ));

    let request_headers = vec![
        HttpHeader {
            name: "Content-Type".to_string(),
            value: "application/json".to_string(),
        },
        HttpHeader {
            name: "Authorization".to_string(),
            value: format!("Bearer {}", auth_token),
        },
        HttpHeader {
            name: "idempotency-key".to_string(),
            value: format!("futura-{}", context.data.key),
        },
    ];

    ic_cdk::println!(
        "📡 Prepared {} headers for HTTP request",
        request_headers.len()
    );

    let url = "https://observatory-7kdhmtcbfq-oa.a.run.app/notifications/email";
    ic_cdk::println!("🌐 Making HTTP POST request to: {}", url);

    let request = CanisterHttpRequestArgument {
        url: url.to_string(),
        method: HttpMethod::POST,
        body: Some(json_body.into_bytes()),
        max_response_bytes: Some(1000),
        transform: None,
        headers: request_headers,
    };

    ic_cdk::println!("⏳ Initiating HTTP outcall with 5s timeout...");

    match http_request_outcall(request, 5_000_000_000).await {
        Ok((response,)) => {
            ic_cdk::println!(
                "📨 HTTP response received - Status: {}, Body length: {} bytes",
                response.status,
                response.body.len()
            );

            if response.status >= Nat::from(200u32) && response.status < Nat::from(300u32) {
                ic_cdk::println!("✅ Email sent successfully to {}", email_data.to);
                Ok(())
            } else {
                let error_body = String::from_utf8_lossy(&response.body);
                ic_cdk::println!(
                    "❌ Email API error - Status: {}, Body: {}",
                    response.status,
                    error_body
                );
                Err(format!(
                    "Email API returned status {}: {}",
                    response.status, error_body
                ))
            }
        }
        Err((r, m)) => {
            ic_cdk::println!(
                "❌ HTTP request failed - RejectionCode: {:?}, Error: {}",
                r,
                m
            );
            Err(format!(
                "HTTP request failed. RejectionCode: {:?}, Error: {}",
                r, m
            ))
        }
    }
}

include_satellite!();
