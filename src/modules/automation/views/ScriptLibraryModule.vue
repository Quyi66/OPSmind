<template>
  <ModulePageLayout
    :title="moduleTitle"
    :description="moduleDescription"
    :hide-header="true"
  >
    <div class="gfs-module">
      <aside class="gfs-module__nav">
        <div
          v-for="item in navItems"
          :key="item.key"
          class="nav-item"
          :class="{ 'is-active': activeView === item.key }"
          @click="activeView = item.key"
        >
          <i :class="item.icon" />
          <span>{{ item.label }}</span>
        </div>
      </aside>

      <section class="gfs-module__content">
        <!-- 脚本库 -->
        <div v-if="activeView === 'scriptLibrary'" class="view-container">
          <div class="view-card">
            <ScriptFileList
              ref="scriptLibraryRef"
              repo-type="git"
              :initial-dir="scriptLibraryInitialDir"
            />
          </div>
        </div>

        <!-- 文件库 -->
        <div v-else-if="activeView === 'fileLibrary'" class="view-container">
          <div class="view-card">
            <ScriptFileList repo-type="staticfs" />
          </div>
        </div>

        <!-- 脚本审核 -->
        <div v-else-if="activeView === 'scriptReview'" class="view-container">
          <div class="view-card">
            <ScriptFileList
              repo-type="stage"
              @navigate-to-script-library="handleNavigateToScriptLibrary"
            />
          </div>
        </div>

        <!-- 欢迎页 -->
        <div v-else class="welcome-view">
          <div class="feature-cards">
            <div
              class="feature-card"
              @click="activeView = 'scriptLibrary'"
            >
              <div class="feature-card__icon">
                <i class="fa fa-code-merge fa-3x" />
              </div>
              <div class="feature-card__body">
                <h3>脚本库</h3>
                <p>用于管理需要进行版本控制的文本型文件，例如shell脚本、ansible playbook、配置文件等。</p>
              </div>
            </div>

            <div
              class="feature-card"
              @click="activeView = 'fileLibrary'"
            >
              <div class="feature-card__icon">
                <i class="fa fa-archive fa-3x" />
              </div>
              <div class="feature-card__body">
                <h3>文件库</h3>
                <p>用于保存较大的文件，例如软件包和其它二进制文件等。文件库无版本控制。</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </ModulePageLayout>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import ModulePageLayout from '@/modules/shared/components/ModulePageLayout.vue'
import ScriptFileList from '@/modules/automation/components/script/ScriptFileList.vue'

const navItems = [
  { key: 'scriptLibrary', label: '脚本库', icon: 'fas fa-code-branch' },
  { key: 'fileLibrary', label: '文件库', icon: 'fas fa-archive' },
  { key: 'scriptReview', label: '脚本审核', icon: 'fas fa-clipboard-check' }
]

const activeView = ref('scriptLibrary')
const scriptLibraryInitialDir = ref('')
const scriptLibraryRef = ref(null)

// 从审批历史跳转到脚本库
function handleNavigateToScriptLibrary(dir) {
  scriptLibraryInitialDir.value = dir || ''
  activeView.value = 'scriptLibrary'

  // 如果脚本库组件已存在，需要手动刷新目录
  nextTick(() => {
    if (scriptLibraryRef.value?.goDir) {
      scriptLibraryRef.value.goDir(dir || '')
    }
  })
}

const moduleTitle = '文件服务'
const moduleDescription = '管理脚本、配置文件及静态资源'
</script>

<style scoped lang="scss">
.gfs-module {
  display: grid;
  grid-template-columns: 140px 1fr;
  min-height: 600px;
  height: 100%;
}

.gfs-module__nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 8px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.3);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 8px;
  border-radius: 10px;
  color: #334155;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
  font-size: 13px;
}

.nav-item i {
  width: 18px;
  text-align: center;
}

.nav-item:hover {
  background: rgba(59, 130, 246, 0.12);
  color: #1d4ed8;
}

.nav-item.is-active {
  background-color: rgba(173, 181, 189, 0.25);
  color: #1e40af;
}

.gfs-module__content {
  min-height: 100%;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.view-container {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.view-card {
  flex: 1;
  min-height: 0;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.welcome-view {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: #f8fafc;
  padding: 40px;
}

.feature-cards {
  display: flex;
  gap: 24px;
}

.feature-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  width: 280px;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.feature-card__icon {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  border-radius: 20px;
  color: #fff;
  margin-bottom: 20px;
}

.feature-card__body {
  text-align: center;
}

.feature-card__body h3 {
  margin: 0 0 12px;
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}

.feature-card__body p {
  margin: 0;
  font-size: 13px;
  color: #64748b;
  line-height: 1.6;
}

@media (max-width: 1024px) {
  .gfs-module {
    grid-template-columns: 1fr;
  }

  .gfs-module__nav {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
  }

  .nav-item {
    flex: 1 0 120px;
  }

  .feature-cards {
    flex-direction: column;
  }

  .feature-card {
    width: 100%;
    max-width: 320px;
  }
}
</style>
