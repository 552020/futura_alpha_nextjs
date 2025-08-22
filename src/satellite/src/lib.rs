use candid::Nat;

use ic_cdk::api::management_canister::http_request::{
    http_request as http_request_outcall, CanisterHttpRequestArgument, HttpHeader, HttpMethod,
};
use junobuild_macros::{
    on_delete_asset, on_delete_doc, on_delete_many_assets, on_delete_many_docs, on_set_doc,
    on_set_many_docs, on_upload_asset,
};
use junobuild_satellite::{
    include_satellite, OnDeleteAssetContext, OnDeleteDocContext,
    OnDeleteManyAssetsContext, OnDeleteManyDocsContext, OnSetDocContext, OnSetManyDocsContext,
    OnUploadAssetContext,
};
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

#[on_set_doc(collections = ["email_requests"])]
async fn on_set_doc(context: OnSetDocContext) -> Result<(), String> {
    let email_data: EmailRequest = decode_doc_data(&context.data.data.after.data)?;
    
    let email_payload = EmailPayload {
        from: email_data.from.clone(), 
        to: email_data.to.clone(),
        subject: email_data.subject,
        text: format!(
            "Hello {},\n\n{} has shared some files with you through Futura.\n\nYou can access your shared files at: https://futura.app\n\nBest regards,\nThe Futura Team",
            email_data.recipient_name,
            email_data.user_name
        ),
    };
    

    let json_body = serde_json::to_string(&email_payload)
        .map_err(|e| format!("Failed to serialize email payload: {}", e))?;

    let request_headers = vec![
        HttpHeader {
            name: "Content-Type".to_string(),
            value: "application/json".to_string(),
        },
        HttpHeader {
            name: "Authorization".to_string(),
            value: format!("Bearer {}", std::env::var("NOTIFICATIONS_TOKEN").unwrap_or_default()),
        },
        HttpHeader {
            name: "idempotency-key".to_string(),
            value: format!("futura-{}", context.data.key),
        },
    ];

    let request = CanisterHttpRequestArgument {
        url: "https://observatory-7kdhmtcbfq-oa.a.run.app/notifications/email".to_string(),
        method: HttpMethod::POST,
        body: Some(json_body.into_bytes()),
        max_response_bytes: Some(1000),
        transform: None,
        headers: request_headers,
    };

    match http_request_outcall(request, 5_000_000_000).await {
        Ok((response,)) => {
            if response.status >= Nat::from(200u32) && response.status < Nat::from(300u32) {
                ic_cdk::println!("Email sent successfully to {}", email_data.to);
                Ok(())
            } else {
                let error_body = String::from_utf8_lossy(&response.body);
                Err(format!("Email API returned status {}: {}", response.status, error_body))
            }
        }
        Err((r, m)) => {
            Err(format!("HTTP request failed. RejectionCode: {:?}, Error: {}", r, m))
        }
    }
}

#[on_delete_doc]
fn on_delete_doc(_context: OnDeleteDocContext) -> Result<(), String> {
    Ok(())
}

#[on_delete_many_docs]
fn on_delete_many_docs(_context: OnDeleteManyDocsContext) -> Result<(), String> {
    Ok(())
}

#[on_upload_asset]
fn on_upload_asset(_context: OnUploadAssetContext) -> Result<(), String> {
    Ok(())
}

#[on_delete_asset]
fn on_delete_asset(_context: OnDeleteAssetContext) -> Result<(), String> {
    Ok(())
}

#[on_delete_many_assets]
fn on_delete_many_assets(_context: OnDeleteManyAssetsContext) -> Result<(), String> {
    Ok(())
}

#[on_set_many_docs]
async fn on_set_many_docs(_context: OnSetManyDocsContext) -> Result<(), String> {
    Ok(())
}

include_satellite!();