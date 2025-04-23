<template>
  <div>
    <h2>登入</h2>
    <el-form :model="formData" label-width="80px">
      <el-form-item label="OSS 地址">
        <el-input placeholder="Please enter valid content" v-model="formData.ossUrl" />
      </el-form-item>
      <el-form-item label="AK">
        <el-input placeholder="Please enter valid content" v-model="formData.accessKey" />
      </el-form-item>
      <el-form-item label="SK">
        <el-input placeholder="Please enter valid content" v-model="formData.secretKey" type="password" />
      </el-form-item>
      <el-form-item>
        <el-checkbox v-model="formData.remember">保存密码</el-checkbox>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="handleSubmit">登入</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const emit = defineEmits(['update-title'])
emit('update-title', '登入')

const router = useRouter()
const formData = ref({
  ossUrl: '',
  accessKey: '',
  secretKey: '',
  remember: false
})

const handleSubmit = () => {
  if (formData.value.remember) {
    localStorage.setItem('Project:MyDiaryApp;Type:User;Key:LogonData', JSON.stringify(formData.value))
  }
  router.push('/list/')
}
</script>