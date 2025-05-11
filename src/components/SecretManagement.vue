<template>
    <div class="r" :inert="isContentLoading">
        <h2>Secret 管理</h2>

        <div v-if="isLoading">
            <el-icon class="is-loading">
                <RefreshRight />
            </el-icon>
            <span style="margin-left: 0.5em; display: inline-block;">正在获取活动 Secret 列表...</span>
        </div>

        <template v-else>
            <ElButton @click="((showSecretCreateDlg = true), (createData.name = ''), (createData.passwords = {}))">创建 Secret</ElButton>

            <p v-if="!default_sid" data-bold="true">没有设置默认值。请设置一个默认值。</p>

            <!--活动secret列表-->
            <el-card v-for="(data, id) in secrets" :key="id" style="margin-top: 1em;">
                <template #header>
                    <div style="display: flex; overflow: hidden; align-items: center;">
                        <span style="flex: 1; overflow: hidden;text-overflow: ellipsis; white-space: nowrap;" :data-bold="id === default_sid">{{ data.loaded ? data.secret_name : '没有加载' }}</span>
                        <el-button v-if="id !== default_sid" size="small" @click="setDefault(id)">设为默认值</el-button>
                        <el-button v-if="!data.loaded" type="primary" plain size="small"
                            @click="loadSecretItem(id)">加载</el-button>
                        <el-button type="danger" plain size="small" @click="deleteSecret(id)">删除</el-button>
                    </div>
                </template>

                <div class="form-item" style="word-break: break-all;">
                    Secret ID: {{ id }}
                </div>

                <div v-if="data.loaded" style="margin: 0.5em 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span>密码列表:</span>
                        <el-button size="small" @click="addItemPass(id)">增加</el-button>
                    </div>

                    <div style="padding: 10px; border: 1px solid; border-radius: 10px; margin-top: 0.5em;">
                        <div v-for="(value, key) in data.primary_key" :key="key" style="word-break: break-all;">
                            <span v-text="key"></span>
                            <span>:&nbsp;</span>
                            <a href="javascript:" @click="removePasswordInSecret(id, key)">删除密码</a>
                        </div>
                    </div>
                </div>

                <div class="form-item" v-if="data.loaded">
                    <a style="margin-right: 1em;" href="javascript:" @click="editItemName(id)">修改名称</a>
                    <a v-if="data.edited" href="javascript:" @click="saveId(id)">保存更改</a>
                    <span v-if="data.edited">&nbsp;&lt;--&nbsp;请点击“保存更改”</span>
                </div>
            </el-card>
        </template>

        <ElDialog title="创建 Secret" v-model="showSecretCreateDlg" align-center destroy-on-close draggable style="min-width: 300px; max-width: 800px;">
            <label class="form-item">
                <span class="form-item-label-text">Secret 名称</span>
                <el-input clearable class="form-item-input" v-model="createData.name" placeholder="请输入 Secret 名称" />
            </label>

            <div class="form-item" style="display: flex; flex-direction: row; align-items: center; justify-content: space-between;">
                <span>密码列表</span>
                <el-button @click="((mode = 'create'), (showPasswordInputDlg = true))" size=small>增加</el-button>
            </div>

            <div v-for="(value, key) in createData.passwords" :key="key" class="form-item">
                <span style="flex: 1; margin-right: 0.5em; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">{{ key }}</span>
                <el-button @click="delete createData.passwords[key]" size=small>删除</el-button>
            </div>

            <div class="form-item" v-if="isLoading">正在保存……</div>

            <div style="display: flex; margin-top: 0.5em;">
                <el-button :disabled="isLoading" style="flex: 1;" type="primary" plain @click="createSecret">保存</el-button>
                <el-button :disabled="isLoading" style="flex: 1;" type="danger" plain @click="showSecretCreateDlg = !1">取消</el-button>
            </div>
        </ElDialog>

        <ElDialog title="设置密码" v-model="showPasswordInputDlg" align-center destroy-on-close draggable style="min-width: 300px; max-width: 800px;">
            <label class="form-item">
                <span class="form-item-label-text">名称</span>
                <el-input clearable class="form-item-input" v-model="createData.passwordName" placeholder="请输入" />
            </label>
            <label class="form-item">
                <span class="form-item-label-text">密码</span>
                <el-input clearable type="password" show-password class="form-item-input"
                    v-model="createData.passwordValue" placeholder="请输入密码" />
            </label>
            <div style="display: flex; margin-top: 0.5em;">
                <el-button style="flex: 1;" type="primary" plain @click="(execPasswdInput() && (showPasswordInputDlg = false))">保存</el-button>
                <el-button style="flex: 1;" type="danger" plain @click="showPasswordInputDlg = false">取消</el-button>
            </div>
        </ElDialog>
    </div>
</template>

<script>
import { RefreshRight } from '@element-plus/icons-vue'
import { exportContent } from '../ossapi/filelistapi.js';
import { ElMessage, ElMessageBox } from 'element-plus';
import { sign_url } from 'alioss-sign-v4-util';
import { get_random_bytes, hexlify, encrypt_data, decrypt_data } from 'simple-data-crypto/builder';
import { generateQuestion } from '../relation.js';
import { get_secret_default_id } from '../entries.js';

export default {
    data() {
        return {
            isLoading: false,
            isContentLoading: false,
            secrets: {},
            default_sid: null,
            mode: '',
            showSecretCreateDlg: false,
            showPasswordInputDlg: false,
            createData: {
                name: '',
                passwords: {},
                passwordValue: '',
                passwordName: '',
                pp: null, pid: null,
            },
        };
    },
    components: {
        RefreshRight
    },
    emits: ['update-title'],
    props: {
        credits: {
            type: Object,
            required: true,
        },
        staging: {
            type: Boolean,
            default: false,
        },
    },
    methods: {
        async loadSecrets() {
            try {
                if (this.credits.loaded === false) await this.credits.prom;
                
                if (this.staging) {
                    this.isLoading = false;
                    return;
                }

                const url = new URL('./secrets/data/', this.credits.oss_url);
                const data = [];
                await exportContent(url.pathname, data, {
                    username: this.credits.ak,
                    usersecret: this.credits.sk,
                    bucket: this.credits.bucket,
                    region: this.credits.region,
                    oss: this.credits.oss_url,
                });
                for (const i of Reflect.ownKeys(this.secrets)) {
                    Reflect.deleteProperty(this.secrets, i); // 清空旧的 secret 列表，防止重复加载
                }
                for (const i of data) {
                    const secret_id = i.Key.includes('/') ? (i.Key.split('/').pop()) : (i.Key);
                    this.secrets[secret_id] = {
                        loaded: false,
                    };
                }

                // 获取默认值
                this.default_sid = await get_secret_default_id();

                this.isLoading = false;
            }
            catch (error) {
                ElMessageBox.alert('加载 Secret 列表失败，请稍后重试。' + error, '错误', {
                    confirmButtonText: '确定',
                    type: 'error',
                }).then(() => {}).catch(() => {}).finally(() => { this.isLoading = false; })
            }
        },
        execPasswdInput() {
            if (!this.createData.passwordName) {
                return ElMessage.error('请输入密码名称。') && 0;
            }
            if (this.mode === 'create') {
                if (this.createData.passwordName in this.createData.passwords) {
                    return ElMessage.error('密码名称已存在。') && 0;
                }
                this.createData.passwords[this.createData.passwordName] = this.createData.passwordValue;
                // 清空输入框
                this.createData.passwordName = this.createData.passwordValue = '';
                return true;
            }
            if (this.mode === 'add') {
                const id = this.createData.pid;
                if (this.createData.passwordName in this.secrets[id].primary_key) {
                    return ElMessage.error('密码名称已存在。') && 0;
                }
                const pn = this.createData.passwordName, pv = this.createData.passwordValue;
                queueMicrotask(async () => {
                    this.isContentLoading = true;
                    try {
                        this.secrets[id].primary_key[pn] = await encrypt_data(this.createData.pp, pv);
                        this.secrets[id].edited = true;
                    }
                    catch (error) {
                        ElMessage.error('加密失败，请稍后重试。' + error);
                    }
                    finally { this.isContentLoading = false; }
                });
                // 清空输入框
                this.createData.passwordName = this.createData.passwordValue = '';
                return true;
            }
        },
        async createSecret() {
            this.isLoading = true;
            try {
                if (!this.createData.name) {
                    throw 'Secret 名称不能为空。'
                }
                // 保存
                const head = {
                    'Content-Type': 'text/x-secret; charset=utf-8',
                    'x-oss-forbid-overwrite': 'true'
                };
                const secret_id = crypto.randomUUID();
                const url = new URL('./secrets/data/' + secret_id, this.credits.oss_url);
                const signed_url = await sign_url(url, {
                    access_key_id: this.credits.ak,
                    access_key_secret: this.credits.sk,
                    bucket: this.credits.bucket,
                    region: this.credits.region,
                    expires: 30,
                    method: 'PUT',
                    additionalHeadersList: head,
                });
                const data = {};
                data.secret_name = this.createData.name;
                data.primary_key = {};
                const tmp_key = hexlify(get_random_bytes(128));
                let p = 0;
                for (const [key, value] of Object.entries(this.createData.passwords)) {
                    p = 1;
                    data.primary_key[key] = await encrypt_data(tmp_key, value);
                }
                data.vcs = 2025050411;

                if (!p) throw '请至少设置一个密码。'

                const resp = await fetch(signed_url, {
                    method: 'PUT',
                    headers: head,
                    body: JSON.stringify(data)
                });
                if (resp.status === 409) throw 'Secret 已存在。';
                if (resp.ok === false) throw `HTTP Error ${resp.status}: ${resp.statusText}`;
                ElMessage.success('Secret 创建成功。');
                this.showSecretCreateDlg = false;
                this.loadSecrets();
            }
            catch (error) {
                ElMessageBox.alert('创建 Secret 失败，请稍后重试。' + error, '错误', {
                    confirmButtonText: '确定',
                    type: 'error',
                }).then(() => {}).catch(() => {}).finally(() => { this.isLoading = false; })
            }
        },
        async loadSecretItem(id) {
            this.isContentLoading = true;
            try {
                const url = new URL('./secrets/data/' + id, this.credits.oss_url);
                const data = await (await fetch(await sign_url(url, {
                    access_key_id: this.credits.ak,
                    access_key_secret: this.credits.sk,
                    bucket: this.credits.bucket,
                    region: this.credits.region,
                    expires: 30,
                }))).json();
                this.secrets[id] = Object.assign(data, {
                    loaded: true,
                });
            }
            catch (error) {
                ElMessage.error('加载 Secret 失败，请稍后重试。' + error);
            }
            finally { this.isContentLoading = false; }
        },
        async deleteSecret(id) {
            try {
                await ElMessageBox.confirm('删除 Secret 后，所有使用此 Secret 加密的数据将**永远无法解密**。这也就是说，删除一个 Secret 相当于永久删除与其关联的数据。确定要删除此 Secret 吗？', '删除', {
                    type: 'warning', confirmButtonText: '输入动态验证码以删除', cancelButtonText: '不删除'
                });
                const otp = Math.floor(Math.random() * 1000000).toString();
                const user = await globalThis.appComponent.requestOtpConfirm('永久删除 Secret', `ID 是 ${id}。动态验证码是 ${otp}。动态验证码不是 ${Math.floor(Math.random() * 1000000).toString()}。`);
                if (user !== otp) throw 'yzmcw';

                // 风险控制
                const { question, answer } = generateQuestion();
                const userRisk = await globalThis.appComponent.requestOtpConfirm('高风险操作', question);
                if (userRisk !== answer) throw 'yzmcw';
            } catch (e) {
                if (e === 'yzmcw') ElMessageBox.alert('我们无法执行此操作，因为动态验证码不正确。', '错误', { confirmButtonText: '好', type: 'error', }).catch((() => { }))
                return;
            }
            // delete secret
            console.log('execute delete');
            const delObject = async (url) => {
                url = await sign_url(url, {
                    access_key_id: this.credits.ak,
                    access_key_secret: this.credits.sk,
                    bucket: this.credits.bucket,
                    region: this.credits.region,
                    expires: 30,
                    method: 'DELETE',
                });
                const resp = await fetch(url, { method: 'DELETE' });
                if (resp.ok === false) throw `HTTP Error ${resp.status}: ${resp.statusText}`;
            };
            try {
                await delObject(new URL('./secrets/data/' + id, this.credits.oss_url));
                await delObject(new URL('./secrets/reverse/' + id, this.credits.oss_url));
                ElMessage.success('Secret 删除成功。');
                this.loadSecrets();
            }
            catch (e) {
                ElMessageBox.alert('删除 Secret 失败，请稍后重试。' + e, '错误', { confirmButtonText: '好', type: 'error', }).catch((() => { }))
            }
        },
        removePasswordInSecret(id, key) {
            if (Reflect.ownKeys(this.secrets[id].primary_key).length < 2) {
                return ElMessage.error('至少需要保留一个密码。');
            }
            Reflect.deleteProperty(this.secrets[id].primary_key, key);
            this.secrets[id].edited = true;
        },
        async editItemName(id) {
            try {
                const { value } = await ElMessageBox.prompt('请输入新的 Secret 名称。', '修改 Secret 名称', {
                    confirmButtonText: '保存',
                    cancelButtonText: '取消',
                    type: 'info',
                    inputValue: this.secrets[id].secret_name,
                });
                if (!value) throw '名称不能为空。';
                this.secrets[id].secret_name = value;
            }
            catch { return; }
            this.secrets[id].edited = true;
        },
        async saveId(secret_id) {
            this.isContentLoading = true;
            try {
                const head = {
                    'Content-Type': 'text/x-secret; charset=utf-8',
                };
                const url = new URL('./secrets/data/' + secret_id, this.credits.oss_url);
                const signed_url = await sign_url(url, {
                    access_key_id: this.credits.ak,
                    access_key_secret: this.credits.sk,
                    bucket: this.credits.bucket,
                    region: this.credits.region,
                    expires: 30,
                    method: 'PUT',
                    additionalHeadersList: head,
                });
                const data = {};
                data.secret_name = this.secrets[secret_id].secret_name; 
                data.primary_key = this.secrets[secret_id].primary_key;
                data.vcs = 2025050411;

                const resp = await fetch(signed_url, {
                    method: 'PUT',
                    headers: head,
                    body: JSON.stringify(data)
                });
                if (resp.ok === false) throw `HTTP Error ${resp.status}: ${resp.statusText}`;
                ElMessage.success('Secret 已经保存。');
                this.secrets[secret_id].edited = false;
            }
            catch (error) {
                ElMessage.error('保存 Secret 失败，请稍后重试。' + error);
            }
            finally { this.isContentLoading = false; }
        },
        async addItemPass(id) {
            try {
                const {
                    value, option,
                } = await globalThis.appComponent.requestInputPasswd(Reflect.ownKeys(this.secrets[id].primary_key), false);

                // try to decrypt the secret data with the password.
                let pkey = null;
                this.isContentLoading = true;
                if (!option) for (const i of Reflect.ownKeys(this.secrets[id].primary_key)) try {
                    pkey = await decrypt_data(this.secrets[id].primary_key[i], value);
                    break;
                } catch { }
                else pkey = await decrypt_data(this.secrets[id].primary_key[option], value); 
                if (!pkey) throw '使用提供的密码无法解密所有的 Secret 数据。';

                this.mode = 'add';
                this.showPasswordInputDlg = true;
                this.createData.pid = id;
                this.createData.pp = pkey;
            } catch (e) {
                ElMessage.error('添加密码失败。' + e);
            } finally { this.isContentLoading = false; }
        },
        async setDefault(id) {
            try {
                // 只在更新默认值时提示
                if (!!this.default_sid)
                await ElMessageBox.confirm('设置默认值后，所有新的数据将使用此 Secret 加密。原数据将不受影响。确定要设置默认值吗？', '设置默认值', {
                    type: 'warning', confirmButtonText: '设为默认值', cancelButtonText: '不设置'
                });
                const headers = {
                    'Content-Type': 'text/x-default; charset=utf-8',
                }
                const url = new URL('./secrets/default', this.credits.oss_url);
                const signed_url = await sign_url(url, {
                    access_key_id: this.credits.ak,
                    access_key_secret: this.credits.sk,
                    bucket: this.credits.bucket,
                    region: this.credits.region,
                    expires: 30,
                    method: 'PUT',
                    additionalHeadersList: headers,
                });
                const resp = await fetch(signed_url, { method: 'PUT', body: id, headers });
                if (resp.ok === false) throw `HTTP Error ${resp.status}: ${resp.statusText}`;
                ElMessage.success('默认值设置成功。');
                this.default_sid = id;
            }
            catch (e) {
                ElMessage.error('设置默认值失败。' + e);
            }
        },
    },
    async mounted() {
        this.isLoading = true;
        queueMicrotask(async () => { await this.loadSecrets() });
        this.$emit('update-title', 'Secret 管理');
    },
}
</script>

<style scoped>
.form-item {
    display: flex;
    align-items: center;
    white-space: nowrap;
    overflow: hidden;
}
.form-item-label-text {
    margin-right: 0.5em;
}
.form-item+.form-item {
    margin-top: 0.5em;
}
.r[inert] {
    opacity: 0.5;
}
[data-bold="true"] {
    font-weight: bold;
}
</style>