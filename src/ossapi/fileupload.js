import { sign_url } from "alioss-sign-v4-util";
import { xml2json } from "./xml2json";

export async function init_upload(url, bucket, region, username, usersecret, mimeType) {
    const additionalHeadersList = { 'content-disposition': 'inline' };
    if (mimeType) {
        additionalHeadersList['content-type'] = mimeType;
    }
    url.search = '?uploads';
    const signed_url = await sign_url(url, { access_key_id: username, access_key_secret: usersecret, bucket, region, method: 'POST', expires: 3600, additionalHeadersList });
    const resp = await fetch(signed_url, {
        method: 'POST',
        headers: additionalHeadersList,
    });
    if (!resp.ok) throw new Error('Failed to initlate multi-part upload. Error: ' + resp.status + resp.statusText);
    const value = xml2json(await resp.text());
    return value.UploadId;
}
export async function send(url, blob, bucket, region, username, usersecret, chunk_id, UploadId, mimeType = '', callback = null) {
    const additionalHeadersList = { 'content-disposition': 'inline' };
    if (blob.type) {
        additionalHeadersList['content-type'] = blob.type;
    }
    else if (mimeType) {
        additionalHeadersList['content-type'] = mimeType;
    }
    if (!chunk_id) {
        // signle part
        const signed_url = await sign_url(url, { access_key_id: username, access_key_secret: usersecret, bucket, region, method: 'PUT', expires: 3600, additionalHeadersList });
        const response = await fetch(signed_url, {
            method: 'PUT',
            body: blob,
            headers: additionalHeadersList,
        }, callback);
        if (!response.ok) throw new Error('Failed to upload block ' + chunk_id + ' at position . Error: ' + response.status + ' ' + response.statusText);
        await response.text(); // 等待请求完成

        const crc64 = response.headers.get('x-oss-hash-crc64ecma');
        const ETag = response.headers.get('etag');
        return { crc64, ETag };
    }
    url.searchParams.set('partNumber', chunk_id);
    url.searchParams.set('uploadId', UploadId);
    const signed_url = await sign_url(url, { access_key_id: username, access_key_secret: usersecret, bucket, region, method: 'PUT', expires: 3600, additionalHeadersList });

    // core upload
    const response = await fetch(signed_url, {
        method: 'PUT',
        body: blob,
        headers: additionalHeadersList,
    }, callback);
    if (!response.ok) throw new Error('Failed to upload block ' + chunk_id + ' at position . Error: ' + response.status + ' ' + response.statusText);
    await response.text(); // 等待请求完成

    const crc64 = response.headers.get('x-oss-hash-crc64ecma');
    const ETag = response.headers.get('etag');
    return { crc64, ETag };
}
export async function post_upload(url, bucket, region, username, usersecret, uploadId, etags, mimeType) {
    url.searchParams.set('uploadId', uploadId);
    const additionalHeadersList = { 'content-disposition': 'inline' };
    const signed_url = await sign_url(url, { access_key_id: username, access_key_secret: usersecret, bucket, region, method: 'POST', expires: 3600, additionalHeadersList });
    const body_parts = [`<CompleteMultipartUpload>`];
    let n = 0;
    for (const i of etags) {
        ++n;
        body_parts.push(`<Part><PartNumber>${n}</PartNumber><ETag>${i}</ETag></Part>`)
    }
    body_parts.push(`</CompleteMultipartUpload>`);
    const resp = await fetch(signed_url, {
        method: 'POST',
        body: new Blob(body_parts),
        headers: additionalHeadersList,
    });
    if (!resp.ok) throw new Error('Failed to complete multi-part upload. Error: ' + resp.status + resp.statusText);
    const value = xml2json(await resp.text());
    return value.ETag;
}


