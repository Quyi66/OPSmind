<template>
  <div class="batch-credentials">
    <el-alert :title="hint" type="info" :closable="false" />
    <section v-for="os in operatingSystems" :key="os" class="credential-group">
      <el-form-item :label="os === 'linux' ? 'Linux 凭据' : 'Windows 凭据'">
        <el-switch
          :model-value="modelValue[os].enabled"
          active-text="提供凭据推装"
          @update:model-value="update(os, 'enabled', $event)"
        />
      </el-form-item>
      <template v-if="modelValue[os].enabled">
        <el-form-item v-if="os === 'linux'" label="认证方式">
          <el-radio-group
            :model-value="modelValue[os].authType"
            @update:model-value="update(os, 'authType', $event)"
          >
            <el-radio value="password">密码</el-radio>
            <el-radio value="key">执行机 SSH 私钥</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="登录用户" required>
          <el-input
            :model-value="modelValue[os].user"
            autocomplete="off"
            @update:model-value="update(os, 'user', $event)"
          />
        </el-form-item>
        <el-form-item
          v-if="os !== 'linux' || modelValue[os].authType !== 'key'"
          label="登录密码"
          required
        >
          <el-input
            :model-value="modelValue[os].password"
            type="password"
            show-password
            autocomplete="new-password"
            @update:model-value="update(os, 'password', $event)"
          />
        </el-form-item>
        <el-form-item v-if="os === 'linux'" label="sudo 密码">
          <el-input
            :model-value="modelValue[os].becomePassword"
            type="password"
            show-password
            autocomplete="new-password"
            placeholder="留空时默认同登录密码"
            @update:model-value="update(os, 'becomePassword', $event)"
          />
        </el-form-item>
        <el-form-item label="连接端口" required>
          <el-input-number
            :model-value="modelValue[os].port"
            :min="1"
            :max="65535"
            :precision="0"
            @update:model-value="update(os, 'port', $event)"
          />
        </el-form-item>
        <template v-if="os === 'windows'">
          <el-form-item label="WinRM 认证">
            <el-select
              :model-value="modelValue[os].winrmTransport"
              @update:model-value="update(os, 'winrmTransport', $event)"
            >
              <el-option label="NTLM" value="ntlm" />
              <el-option label="Basic" value="basic" />
              <el-option label="Kerberos" value="kerberos" />
            </el-select>
          </el-form-item>
          <el-form-item label="WinRM 协议">
            <el-select
              :model-value="modelValue[os].winrmScheme"
              @update:model-value="update(os, 'winrmScheme', $event)"
            >
              <el-option label="自动（5986 使用 HTTPS，其余 HTTP）" value="" />
              <el-option label="HTTP" value="http" />
              <el-option label="HTTPS" value="https" />
            </el-select>
          </el-form-item>
        </template>
      </template>
    </section>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Object, required: true },
  operatingSystems: { type: Array, default: () => ['linux', 'windows'] },
  hint: {
    type: String,
    default:
      '每种系统可留空；未提供凭据的主机使用批次脚本安装。Linux 需 root 或 sudo 权限，Windows 需管理员权限。'
  }
})
const emit = defineEmits(['update:modelValue'])
function update(os, field, value) {
  emit('update:modelValue', {
    ...props.modelValue,
    [os]: { ...props.modelValue[os], [field]: value }
  })
}
</script>

<style scoped>
.credential-group {
  margin-top: 16px;
}
</style>
