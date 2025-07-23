<template>
  <div class="role-permission-manager">
    <el-tabs v-model="activeTab">
      <el-tab-pane label="角色管理" name="roles">
        <div class="role-management">
          <div class="section-header">
            <h3>角色列表</h3>
            <el-button type="primary" size="small" @click="showCreateRoleDialog">
              创建角色
            </el-button>
          </div>

          <el-table :data="roles" style="width: 100%" v-loading="rolesLoading">
            <el-table-column prop="name" label="角色名称" />
            <el-table-column prop="code" label="角色代码" />
            <el-table-column prop="description" label="描述" />
            <el-table-column label="系统角色">
              <template #default="scope">
                <el-tag v-if="scope.row.isSystem" type="info">是</el-tag>
                <span v-else>否</span>
              </template>
            </el-table-column>
            <el-table-column label="权限数量">
              <template #default="scope">
                {{ scope.row.permissions?.length || 0 }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200">
              <template #default="scope">
                <el-button
                  size="small"
                  @click="editRole(scope.row)"
                  :disabled="scope.row.isSystem"
                >
                  编辑
                </el-button>
                <el-button
                  size="small"
                  @click="manageRolePermissions(scope.row)"
                >
                  权限
                </el-button>
                <el-button
                  size="small"
                  type="danger"
                  @click="confirmDeleteRole(scope.row)"
                  :disabled="scope.row.isSystem"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="权限管理" name="permissions">
        <div class="permission-management">
          <div class="section-header">
            <h3>权限列表</h3>
          </div>

          <el-input
            v-model="permissionSearch"
            placeholder="搜索权限"
            clearable
            style="margin-bottom: 15px; width: 300px"
          />

          <el-table :data="filteredPermissions" style="width: 100%" v-loading="permissionsLoading">
            <el-table-column prop="name" label="权限名称" />
            <el-table-column prop="code" label="权限代码" />
            <el-table-column prop="description" label="描述" />
            <el-table-column prop="category" label="分类" />
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="用户角色" name="user-roles">
        <div class="user-role-management">
          <div class="section-header">
            <h3>用户角色管理</h3>
          </div>

          <el-input
            v-model="userSearch"
            placeholder="搜索用户"
            clearable
            style="margin-bottom: 15px; width: 300px"
          />

          <el-table :data="filteredUsers" style="width: 100%" v-loading="usersLoading">
            <el-table-column prop="username" label="用户名" />
            <el-table-column prop="email" label="邮箱" />
            <el-table-column label="角色">
              <template #default="scope">
                <el-tag
                  v-for="role in scope.row.roles"
                  :key="role.code"
                  style="margin-right: 5px"
                >
                  {{ role.name }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150">
              <template #default="scope">
                <el-button size="small" @click="manageUserRoles(scope.row)">
                  管理角色
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 创建/编辑角色对话框 -->
    <el-dialog
      v-model="roleDialogVisible"
      :title="isEditingRole ? '编辑角色' : '创建角色'"
      width="500px"
    >
      <el-form :model="roleForm" label-width="100px" :rules="roleRules" ref="roleFormRef">
        <el-form-item label="角色名称" prop="name">
          <el-input v-model="roleForm.name" />
        </el-form-item>
        <el-form-item label="角色代码" prop="code">
          <el-input v-model="roleForm.code" :disabled="isEditingRole" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="roleForm.description" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="roleDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveRole" :loading="saveRoleLoading">
            保存
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 角色权限管理对话框 -->
    <el-dialog
      v-model="rolePermissionsDialogVisible"
      :title="`管理角色权限: ${currentRole?.name || ''}`"
      width="700px"
    >
      <div v-if="currentRole">
        <el-input
          v-model="permissionAssignSearch"
          placeholder="搜索权限"
          clearable
          style="margin-bottom: 15px"
        />

        <el-tabs v-model="permissionAssignTab">
          <el-tab-pane label="按分类" name="category">
            <el-collapse v-model="expandedCategories">
              <el-collapse-item
                v-for="category in permissionCategories"
                :key="category"
                :title="category"
                :name="category"
              >
                <el-checkbox-group v-model="selectedPermissions">
                  <div
                    v-for="permission in getPermissionsByCategory(category)"
                    :key="permission.id"
                    class="permission-item"
                  >
                    <el-checkbox :label="permission.id">
                      {{ permission.name }} ({{ permission.code }})
                    </el-checkbox>
                    <el-tooltip :content="permission.description" placement="top">
                      <el-icon><InfoFilled /></el-icon>
                    </el-tooltip>
                  </div>
                </el-checkbox-group>
              </el-collapse-item>
            </el-collapse>
          </el-tab-pane>

          <el-tab-pane label="全部权限" name="all">
            <el-checkbox-group v-model="selectedPermissions">
              <div
                v-for="permission in filteredAssignPermissions"
                :key="permission.id"
                class="permission-item"
              >
                <el-checkbox :label="permission.id">
                  {{ permission.name }} ({{ permission.code }})
                </el-checkbox>
                <el-tooltip :content="permission.description" placement="top">
                  <el-icon><InfoFilled /></el-icon>
                </el-tooltip>
              </div>
            </el-checkbox-group>
          </el-tab-pane>
        </el-tabs>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="rolePermissionsDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveRolePermissions" :loading="savePermissionsLoading">
            保存
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 用户角色管理对话框 -->
    <el-dialog
      v-model="userRolesDialogVisible"
      :title="`管理用户角色: ${currentUser?.username || ''}`"
      width="500px"
    >
      <div v-if="currentUser">
        <el-checkbox-group v-model="selectedUserRoles">
          <div v-for="role in roles" :key="role.id" class="role-item">
            <el-checkbox :label="role.id">
              {{ role.name }} ({{ role.code }})
            </el-checkbox>
            <el-tooltip :content="role.description" placement="top">
              <el-icon><InfoFilled /></el-icon>
            </el-tooltip>
          </div>
        </el-checkbox-group>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="userRolesDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveUserRoles" :loading="saveUserRolesLoading">
            保存
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { InfoFilled } from '@element-plus/icons-vue'
import { permissionService, type Role, type Permission } from '@/services/permissionService'
import axios from 'axios'
import { authService } from '@/services/authService'

// 状态
const activeTab = ref('roles')
const roles = ref<Role[]>([])
const permissions = ref<Permission[]>([])
const users = ref<any[]>([])
const rolesLoading = ref(false)
const permissionsLoading = ref(false)
const usersLoading = ref(false)
const permissionSearch = ref('')
const userSearch = ref('')
const permissionAssignSearch = ref('')
const permissionAssignTab = ref('category')
const expandedCategories = ref<string[]>([])

// 角色对话框
const roleDialogVisible = ref(false)
const isEditingRole = ref(false)
const roleForm = reactive({
  id: 0,
  name: '',
  code: '',
  description: '',
})
const roleFormRef = ref()
const roleRules = {
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入角色代码', trigger: 'blur' }],
}
const saveRoleLoading = ref(false)

// 角色权限对话框
const rolePermissionsDialogVisible = ref(false)
const currentRole = ref<Role | null>(null)
const selectedPermissions = ref<number[]>([])
const savePermissionsLoading = ref(false)

// 用户角色对话框
const userRolesDialogVisible = ref(false)
const currentUser = ref<any | null>(null)
const selectedUserRoles = ref<number[]>([])
const saveUserRolesLoading = ref(false)

// 计算属性
const filteredPermissions = computed(() => {
  if (!permissionSearch.value) {
    return permissions.value
  }
  const search = permissionSearch.value.toLowerCase()
  return permissions.value.filter(
    (p) =>
      p.name.toLowerCase().includes(search) ||
      p.code.toLowerCase().includes(search) ||
      p.description.toLowerCase().includes(search) ||
      p.category.toLowerCase().includes(search)
  )
})

const filteredUsers = computed(() => {
  if (!userSearch.value) {
    return users.value
  }
  const search = userSearch.value.toLowerCase()
  return users.value.filter(
    (u) =>
      u.username.toLowerCase().includes(search) ||
      u.email.toLowerCase().includes(search)
  )
})

const permissionCategories = computed(() => {
  const categories = new Set<string>()
  permissions.value.forEach((p) => categories.add(p.category))
  return Array.from(categories).sort()
})

const filteredAssignPermissions = computed(() => {
  if (!permissionAssignSearch.value) {
    return permissions.value
  }
  const search = permissionAssignSearch.value.toLowerCase()
  return permissions.value.filter(
    (p) =>
      p.name.toLowerCase().includes(search) ||
      p.code.toLowerCase().includes(search) ||
      p.description.toLowerCase().includes(search) ||
      p.category.toLowerCase().includes(search)
  )
})

// 方法
function getPermissionsByCategory(category: string) {
  if (!permissionAssignSearch.value) {
    return permissions.value.filter((p) => p.category === category)
  }
  const search = permissionAssignSearch.value.toLowerCase()
  return permissions.value.filter(
    (p) =>
      p.category === category &&
      (p.name.toLowerCase().includes(search) ||
        p.code.toLowerCase().includes(search) ||
        p.description.toLowerCase().includes(search))
  )
}

async function loadRoles() {
  rolesLoading.value = true
  try {
    roles.value = await permissionService.getAllRoles()
  } catch (error) {
    console.error('加载角色失败:', error)
    ElMessage.error('加载角色失败')
  } finally {
    rolesLoading.value = false
  }
}

async function loadPermissions() {
  permissionsLoading.value = true
  try {
    permissions.value = await permissionService.getAllPermissions()
  } catch (error) {
    console.error('加载权限失败:', error)
    ElMessage.error('加载权限失败')
  } finally {
    permissionsLoading.value = false
  }
}

async function loadUsers() {
  usersLoading.value = true
  try {
    const response = await axios.get('/api/v1/users', {
      headers: authService.getAuthHeader(),
    })
    users.value = response.data
  } catch (error) {
    console.error('加载用户失败:', error)
    ElMessage.error('加载用户失败')
  } finally {
    usersLoading.value = false
  }
}

function showCreateRoleDialog() {
  isEditingRole.value = false
  roleForm.id = 0
  roleForm.name = ''
  roleForm.code = ''
  roleForm.description = ''
  roleDialogVisible.value = true
}

function editRole(role: Role) {
  isEditingRole.value = true
  roleForm.id = role.id
  roleForm.name = role.name
  roleForm.code = role.code
  roleForm.description = role.description
  roleDialogVisible.value = true
}

async function saveRole() {
  if (!roleFormRef.value) return

  try {
    await roleFormRef.value.validate()
  } catch (error) {
    return
  }

  saveRoleLoading.value = true

  try {
    if (isEditingRole.value) {
      await permissionService.updateRole(roleForm.id, {
        name: roleForm.name,
        description: roleForm.description,
      })
      ElMessage.success('角色更新成功')
    } else {
      await permissionService.createRole({
        name: roleForm.name,
        code: roleForm.code,
        description: roleForm.description,
      })
      ElMessage.success('角色创建成功')
    }
    roleDialogVisible.value = false
    loadRoles()
  } catch (error) {
    console.error('保存角色失败:', error)
    ElMessage.error('保存角色失败')
  } finally {
    saveRoleLoading.value = false
  }
}

function confirmDeleteRole(role: Role) {
  ElMessageBox.confirm(`确定要删除角色 "${role.name}" 吗？`, '确认删除', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(async () => {
      try {
        await permissionService.deleteRole(role.id)
        ElMessage.success('角色删除成功')
        loadRoles()
      } catch (error) {
        console.error('删除角色失败:', error)
        ElMessage.error('删除角色失败')
      }
    })
    .catch(() => {
      // 用户取消删除
    })
}

function manageRolePermissions(role: Role) {
  currentRole.value = role
  selectedPermissions.value = role.permissions?.map((p) => p.id) || []
  rolePermissionsDialogVisible.value = true
}

async function saveRolePermissions() {
  if (!currentRole.value) return

  savePermissionsLoading.value = true

  try {
    await permissionService.assignPermissionsToRole(
      currentRole.value.id,
      selectedPermissions.value
    )
    ElMessage.success('角色权限更新成功')
    rolePermissionsDialogVisible.value = false
    loadRoles()
  } catch (error) {
    console.error('保存角色权限失败:', error)
    ElMessage.error('保存角色权限失败')
  } finally {
    savePermissionsLoading.value = false
  }
}

function manageUserRoles(user: any) {
  currentUser.value = user
  selectedUserRoles.value = user.roles?.map((r: any) => r.id) || []
  userRolesDialogVisible.value = true
}

async function saveUserRoles() {
  if (!currentUser.value) return

  saveUserRolesLoading.value = true

  try {
    await permissionService.assignRolesToUser(
      currentUser.value.id,
      selectedUserRoles.value
    )
    ElMessage.success('用户角色更新成功')
    userRolesDialogVisible.value = false
    loadUsers()
  } catch (error) {
    console.error('保存用户角色失败:', error)
    ElMessage.error('保存用户角色失败')
  } finally {
    saveUserRolesLoading.value = false
  }
}

// 生命周期钩子
onMounted(async () => {
  await Promise.all([loadRoles(), loadPermissions()])
  if (activeTab.value === 'user-roles') {
    loadUsers()
  }
})

// 监听标签页切换
watch(activeTab, (newTab) => {
  if (newTab === 'user-roles' && users.value.length === 0) {
    loadUsers()
  }
})
</script>

<style scoped>
.role-permission-manager {
  padding: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h3 {
  margin: 0;
}

.permission-item,
.role-item {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.permission-item .el-icon,
.role-item .el-icon {
  margin-left: 8px;
  color: #909399;
  cursor: pointer;
}
</style>