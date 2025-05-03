<template>
  <div class="page-management">
    <div class="header-section">
      <h2 class="section-title">页面管理</h2>
      <div class="action-buttons">
        <el-button type="primary" @click="showCreateDialog">
          <el-icon><Plus /></el-icon>
          添加页面
        </el-button>
        <el-button type="success" @click="initSystemPages" :loading="isInitializing">
          <el-icon><RefreshRight /></el-icon>
          初始化系统页面
        </el-button>
        <el-button type="warning" @click="showBatchDialog">
          <el-icon><Operation /></el-icon>
          批量操作
        </el-button>
      </div>
    </div>

    <!-- 初始化提示 -->
    <el-alert
      v-if="pages.length === 0"
      title="页面数据为空"
      type="info"
      description="请点击'初始化系统页面'按钮从路由配置中导入页面数据。如果数据库表不存在，系统将自动创建。"
      show-icon
      :closable="false"
      style="margin-bottom: 20px"
    />

    <!-- 筛选器 -->
    <div class="filter-bar">
      <div class="filter-item">
        <el-input
          v-model="filters.search"
          placeholder="搜索页面名称或路径"
          clearable
          @input="handleFilterChange"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>

      <div class="filter-item">
        <el-select
          v-model="filters.status"
          placeholder="状态"
          clearable
          @change="handleFilterChange"
        >
          <el-option label="启用" value="enabled" />
          <el-option label="禁用" value="disabled" />
        </el-select>
      </div>

      <div class="filter-item">
        <el-select
          v-model="filters.membershipLevel"
          placeholder="会员等级"
          clearable
          @change="handleFilterChange"
        >
          <el-option label="免费用户" value="free" />
          <el-option label="基础会员" value="basic" />
          <el-option label="高级会员" value="premium" />
          <el-option label="企业版" value="enterprise" />
        </el-select>
      </div>

      <div class="filter-item">
        <el-select
          v-model="filters.isMenu"
          placeholder="菜单显示"
          clearable
          @change="handleFilterChange"
        >
          <el-option label="显示在菜单" value="true" />
          <el-option label="不显示在菜单" value="false" />
        </el-select>
      </div>
    </div>

    <!-- 页面列表 -->
    <div class="page-list">
      <el-table
        v-loading="isLoading"
        :data="filteredPages"
        border
        stripe
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="页面信息" min-width="200">
          <template #default="scope">
            <div class="page-info">
              <div class="page-name">
                <span v-if="scope.row.icon" class="page-icon">{{ scope.row.icon }}</span>
                {{ scope.row.name }}
              </div>
              <div class="page-path">{{ scope.row.path }}</div>
              <div class="page-description">{{ scope.row.description || '无描述' }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="菜单显示" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.isMenu ? 'success' : 'info'">
              {{ scope.row.isMenu ? '显示' : '隐藏' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="认证要求" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.requiresAuth ? 'warning' : 'success'">
              {{ scope.row.requiresAuth ? '需要' : '不需要' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="管理员权限" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.requiresAdmin ? 'danger' : 'success'">
              {{ scope.row.requiresAdmin ? '需要' : '不需要' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="会员等级" width="120">
          <template #default="scope">
            <el-tag :type="getMembershipTagType(scope.row.requiredMembershipLevel)">
              {{ formatMembershipLevel(scope.row.requiredMembershipLevel) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="scope">
            <el-switch
              v-model="scope.row.isEnabled"
              :active-value="true"
              :inactive-value="false"
              @change="handleStatusChange(scope.row)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <div class="action-buttons">
              <el-button type="primary" size="small" @click="showEditDialog(scope.row)">
                编辑
              </el-button>
              <el-button type="success" size="small" @click="showPermissionDialog(scope.row)">
                权限
              </el-button>
              <el-button type="danger" size="small" @click="handleDelete(scope.row)">
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 创建/编辑页面对话框 -->
    <el-dialog
      v-model="pageDialog.visible"
      :title="pageDialog.isEdit ? '编辑页面' : '创建页面'"
      width="600px"
    >
      <el-form
        ref="pageFormRef"
        :model="pageDialog.form"
        :rules="pageDialog.rules"
        label-width="100px"
      >
        <el-form-item label="页面名称" prop="name">
          <el-input v-model="pageDialog.form.name" placeholder="请输入页面名称" />
        </el-form-item>

        <el-form-item label="页面路径" prop="path">
          <el-input v-model="pageDialog.form.path" placeholder="请输入页面路径，如 /dashboard" />
        </el-form-item>

        <el-form-item label="页面描述" prop="description">
          <el-input
            v-model="pageDialog.form.description"
            type="textarea"
            placeholder="请输入页面描述"
          />
        </el-form-item>

        <el-form-item label="页面图标" prop="icon">
          <el-input v-model="pageDialog.form.icon" placeholder="请输入页面图标，如 📊" />
        </el-form-item>

        <el-form-item label="组件路径" prop="component">
          <el-input
            v-model="pageDialog.form.component"
            placeholder="请输入组件路径，如 DashboardView"
          />
        </el-form-item>

        <el-form-item label="父页面" prop="parentId">
          <el-select v-model="pageDialog.form.parentId" placeholder="请选择父页面" clearable>
            <el-option
              v-for="page in pages"
              :key="page.id"
              :label="page.name"
              :value="page.id"
              :disabled="page.id === pageDialog.form.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="排序顺序" prop="sortOrder">
          <el-input-number v-model="pageDialog.form.sortOrder" :min="0" :max="1000" />
        </el-form-item>

        <el-form-item label="菜单显示" prop="isMenu">
          <el-switch v-model="pageDialog.form.isMenu" />
        </el-form-item>

        <el-form-item label="需要认证" prop="requiresAuth">
          <el-switch v-model="pageDialog.form.requiresAuth" />
        </el-form-item>

        <el-form-item label="需要管理员" prop="requiresAdmin">
          <el-switch v-model="pageDialog.form.requiresAdmin" />
        </el-form-item>

        <el-form-item label="会员等级" prop="requiredMembershipLevel">
          <el-select v-model="pageDialog.form.requiredMembershipLevel" placeholder="请选择会员等级">
            <el-option label="免费用户" value="free" />
            <el-option label="基础会员" value="basic" />
            <el-option label="高级会员" value="premium" />
            <el-option label="企业版" value="enterprise" />
          </el-select>
        </el-form-item>

        <el-form-item label="是否启用" prop="isEnabled">
          <el-switch v-model="pageDialog.form.isEnabled" />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="pageDialog.visible = false">取消</el-button>
          <el-button type="primary" @click="handleSavePage" :loading="pageDialog.isSaving">
            保存
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 权限设置对话框 -->
    <el-dialog
      v-model="permissionDialog.visible"
      :title="`设置页面权限: ${permissionDialog.pageName}`"
      width="500px"
    >
      <div class="permission-form">
        <div class="permission-header">
          <div class="membership-level">会员等级</div>
          <div class="access-status">访问权限</div>
        </div>

        <div
          v-for="(permission, index) in permissionDialog.permissions"
          :key="index"
          class="permission-item"
        >
          <div class="membership-level">
            <el-tag :type="getMembershipTagType(permission.membershipLevel)">
              {{ formatMembershipLevel(permission.membershipLevel) }}
            </el-tag>
          </div>
          <div class="access-status">
            <el-switch v-model="permission.hasAccess" />
          </div>
        </div>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="permissionDialog.visible = false">取消</el-button>
          <el-button
            type="primary"
            @click="handleSavePermissions"
            :loading="permissionDialog.isSaving"
          >
            保存
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 批量操作对话框 -->
    <el-dialog v-model="batchDialog.visible" title="批量操作" width="500px">
      <div class="batch-form">
        <p class="batch-info">已选择 {{ selectedPages.length }} 个页面</p>

        <div class="batch-action">
          <el-radio-group v-model="batchDialog.action">
            <el-radio label="enable">批量启用</el-radio>
            <el-radio label="disable">批量禁用</el-radio>
          </el-radio-group>
        </div>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="batchDialog.visible = false">取消</el-button>
          <el-button
            type="primary"
            @click="handleBatchAction"
            :loading="batchDialog.isProcessing"
            :disabled="selectedPages.length === 0"
          >
            执行
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Plus, Search, RefreshRight, Operation } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { useToast } from '@/composables/useToast'
import pageService, { type SystemPage, type PagePermission } from '@/services/pageService'

// 状态
const isLoading = ref(false)
const isInitializing = ref(false)
const pages = ref<SystemPage[]>([])
const selectedPages = ref<SystemPage[]>([])
const { showToast } = useToast()

// 筛选条件
const filters = reactive({
  search: '',
  status: '',
  membershipLevel: '',
  isMenu: '',
})

// 页面对话框
const pageDialog = reactive({
  visible: false,
  isEdit: false,
  isSaving: false,
  form: {
    id: undefined as number | undefined,
    path: '',
    name: '',
    description: '',
    icon: '',
    component: '',
    isMenu: true,
    parentId: undefined as number | undefined,
    sortOrder: 0,
    isEnabled: true,
    requiresAuth: true,
    requiresAdmin: false,
    requiredMembershipLevel: 'free',
  },
  rules: {
    name: [{ required: true, message: '请输入页面名称', trigger: 'blur' }],
    path: [{ required: true, message: '请输入页面路径', trigger: 'blur' }],
    component: [{ required: true, message: '请输入组件路径', trigger: 'blur' }],
  },
})

// 权限对话框
const permissionDialog = reactive({
  visible: false,
  pageId: 0,
  pageName: '',
  permissions: [] as PagePermission[],
  isSaving: false,
})

// 批量操作对话框
const batchDialog = reactive({
  visible: false,
  action: 'enable',
  isProcessing: false,
})

// 页面表单引用
const pageFormRef = ref()

// 计算属性：过滤后的页面列表
const filteredPages = computed(() => {
  let result = [...pages.value]

  // 搜索过滤
  if (filters.search) {
    const searchLower = filters.search.toLowerCase()
    result = result.filter(
      (page) =>
        page.name.toLowerCase().includes(searchLower) ||
        page.path.toLowerCase().includes(searchLower) ||
        (page.description && page.description.toLowerCase().includes(searchLower))
    )
  }

  // 状态过滤
  if (filters.status) {
    result = result.filter((page) =>
      filters.status === 'enabled' ? page.isEnabled : !page.isEnabled
    )
  }

  // 会员等级过滤
  if (filters.membershipLevel) {
    result = result.filter((page) => page.requiredMembershipLevel === filters.membershipLevel)
  }

  // 菜单显示过滤
  if (filters.isMenu) {
    result = result.filter((page) => page.isMenu === (filters.isMenu === 'true'))
  }

  return result
})

// 生命周期钩子
onMounted(async () => {
  await fetchPages()
})

// 获取所有页面
const fetchPages = async () => {
  isLoading.value = true

  try {
    pages.value = await pageService.getAllPages({ withPermissions: true })
  } catch (error) {
    console.error('获取页面列表失败:', error)

    // 检查是否是数据库表不存在的错误
    if (
      error.response?.data?.message &&
      (error.response.data.message.includes("doesn't exist") ||
        error.response.data.message.includes('no such table'))
    ) {
      showToast('页面管理表不存在，请先执行数据库迁移或点击"初始化系统页面"按钮', 'warning', 10000)
    } else {
      showToast('获取页面列表失败: ' + (error.response?.data?.message || error.message), 'error')
    }

    // 设置空数组，避免页面报错
    pages.value = []
  } finally {
    isLoading.value = false
  }
}

// 处理筛选条件变化
const handleFilterChange = () => {
  // 筛选逻辑由计算属性处理
}

// 处理表格选择变化
const handleSelectionChange = (selection: SystemPage[]) => {
  selectedPages.value = selection
}

// 显示创建页面对话框
const showCreateDialog = () => {
  pageDialog.isEdit = false
  pageDialog.form = {
    id: undefined,
    path: '',
    name: '',
    description: '',
    icon: '',
    component: '',
    isMenu: true,
    parentId: undefined,
    sortOrder: 0,
    isEnabled: true,
    requiresAuth: true,
    requiresAdmin: false,
    requiredMembershipLevel: 'free',
  }
  pageDialog.visible = true
}

// 显示编辑页面对话框
const showEditDialog = (page: SystemPage) => {
  pageDialog.isEdit = true
  pageDialog.form = { ...page }
  pageDialog.visible = true
}

// 显示权限设置对话框
const showPermissionDialog = async (page: SystemPage) => {
  permissionDialog.pageId = page.id!
  permissionDialog.pageName = page.name

  // 准备权限数据
  const membershipLevels = ['free', 'basic', 'premium', 'enterprise']

  // 如果页面已有权限数据，使用现有数据
  if (page.permissions && page.permissions.length > 0) {
    permissionDialog.permissions = [...page.permissions]
  } else {
    // 否则创建默认权限数据
    permissionDialog.permissions = membershipLevels.map((level) => ({
      membershipLevel: level,
      hasAccess: level === 'free', // 默认只有免费用户可访问
    }))
  }

  permissionDialog.visible = true
}

// 显示批量操作对话框
const showBatchDialog = () => {
  if (selectedPages.value.length === 0) {
    showToast('请先选择要操作的页面', 'warning')
    return
  }

  batchDialog.action = 'enable'
  batchDialog.visible = true
}

// 处理保存页面
const handleSavePage = async () => {
  // 表单验证
  await pageFormRef.value.validate(async (valid: boolean) => {
    if (!valid) {
      return
    }

    pageDialog.isSaving = true

    try {
      if (pageDialog.isEdit) {
        // 更新页面
        await pageService.updatePage(pageDialog.form.id!, pageDialog.form)
      } else {
        // 创建页面
        await pageService.createPage(pageDialog.form)
      }

      // 关闭对话框
      pageDialog.visible = false

      // 刷新页面列表
      await fetchPages()
    } catch (error) {
      console.error('保存页面失败:', error)
    } finally {
      pageDialog.isSaving = false
    }
  })
}

// 处理保存权限
const handleSavePermissions = async () => {
  permissionDialog.isSaving = true

  try {
    await pageService.updatePagePermissions(permissionDialog.pageId, permissionDialog.permissions)

    // 关闭对话框
    permissionDialog.visible = false

    // 刷新页面列表
    await fetchPages()
  } catch (error) {
    console.error('保存权限失败:', error)
  } finally {
    permissionDialog.isSaving = false
  }
}

// 处理删除页面
const handleDelete = async (page: SystemPage) => {
  try {
    await ElMessageBox.confirm(`确定要删除页面 "${page.name}" 吗？`, '删除页面', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    await pageService.deletePage(page.id!)

    // 刷新页面列表
    await fetchPages()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除页面失败:', error)
    }
  }
}

// 处理状态变更
const handleStatusChange = async (page: SystemPage) => {
  try {
    await pageService.updatePage(page.id!, { isEnabled: page.isEnabled })
  } catch (error) {
    console.error('更新页面状态失败:', error)
    // 恢复原状态
    page.isEnabled = !page.isEnabled
  }
}

// 处理批量操作
const handleBatchAction = async () => {
  if (selectedPages.value.length === 0) {
    showToast('请先选择要操作的页面', 'warning')
    return
  }

  batchDialog.isProcessing = true

  try {
    const ids = selectedPages.value.map((page) => page.id!)
    const isEnabled = batchDialog.action === 'enable'

    await pageService.batchUpdateStatus(ids, isEnabled)

    // 关闭对话框
    batchDialog.visible = false

    // 刷新页面列表
    await fetchPages()
  } catch (error) {
    console.error('批量操作失败:', error)
  } finally {
    batchDialog.isProcessing = false
  }
}

// 初始化系统页面
const initSystemPages = async () => {
  try {
    await ElMessageBox.confirm(
      '初始化系统页面将从路由配置中导入页面，已存在的页面不会被覆盖。如果数据库表不存在，系统将自动创建。确定要继续吗？',
      '初始化系统页面',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    isLoading.value = true
    isInitializing.value = true

    try {
      await pageService.initSystemPages()
      showToast('系统页面初始化成功', 'success')
    } catch (error) {
      console.error('初始化系统页面失败:', error)

      // 检查是否是数据库表不存在的错误
      if (
        error.response?.data?.message &&
        (error.response.data.message.includes("doesn't exist") ||
          error.response.data.message.includes('no such table'))
      ) {
        showToast('正在尝试创建数据库表，请稍后再试...', 'warning', 5000)

        // 延迟1秒后再次尝试
        await new Promise((resolve) => setTimeout(resolve, 1000))
        await pageService.initSystemPages()
      } else if (error !== 'cancel') {
        showToast(
          '初始化系统页面失败: ' + (error.response?.data?.message || error.message),
          'error'
        )
      }
    }

    // 刷新页面列表
    await fetchPages()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('初始化系统页面失败:', error)
    }
  } finally {
    isLoading.value = false
    isInitializing.value = false
  }
}

// 格式化会员等级
const formatMembershipLevel = (level: string) => {
  const levelMap: Record<string, string> = {
    free: '免费用户',
    basic: '基础会员',
    premium: '高级会员',
    enterprise: '企业版',
  }
  return levelMap[level] || level
}

// 获取会员等级标签类型
const getMembershipTagType = (level: string) => {
  const typeMap: Record<string, string> = {
    free: '',
    basic: 'success',
    premium: 'warning',
    enterprise: 'danger',
  }
  return typeMap[level] || ''
}
</script>

<style scoped>
.page-management {
  padding: 20px;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-title {
  margin: 0;
  font-size: 24px;
  color: #333;
}

.action-buttons {
  display: flex;
  gap: 10px;
}

.filter-bar {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.filter-item {
  width: 200px;
}

.page-list {
  margin-bottom: 20px;
}

.page-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-name {
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 5px;
}

.page-icon {
  font-size: 18px;
}

.page-path {
  color: #409eff;
  font-family: monospace;
}

.page-description {
  color: #666;
  font-size: 12px;
}

.permission-form {
  padding: 10px;
}

.permission-header {
  display: flex;
  justify-content: space-between;
  padding: 10px;
  background-color: #f5f7fa;
  border-radius: 4px;
  margin-bottom: 10px;
  font-weight: bold;
}

.permission-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid #eee;
}

.membership-level {
  flex: 1;
}

.access-status {
  width: 100px;
  text-align: center;
}

.batch-form {
  padding: 20px;
}

.batch-info {
  margin-bottom: 20px;
  font-weight: bold;
}

.batch-action {
  margin-bottom: 20px;
}
</style>
