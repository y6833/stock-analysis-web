<template>
  <div class="watchlist-manager">
    <div class="watchlist-header">
      <h3>我的关注</h3>
      <el-button type="primary" size="small" @click="showCreateWatchlistDialog">
        <i class="el-icon-plus"></i> 新建分组
      </el-button>
    </div>

    <el-tabs v-model="activeWatchlist" type="card" @tab-click="handleTabClick">
      <el-tab-pane
        v-for="watchlist in watchlists"
        :key="watchlist.id"
        :label="watchlist.name"
        :name="watchlist.id.toString()"
      >
        <div class="watchlist-actions">
          <el-button type="text" @click="showEditWatchlistDialog(watchlist)">
            <i class="el-icon-edit"></i> 编辑分组
          </el-button>
          <el-button type="text" @click="showDeleteWatchlistDialog(watchlist)" :disabled="watchlists.length <= 1">
            <i class="el-icon-delete"></i> 删除分组
          </el-button>
          <el-button type="text" @click="showAddStockDialog">
            <i class="el-icon-plus"></i> 添加股票
          </el-button>
        </div>

        <el-table
          :data="currentWatchlistItems"
          style="width: 100%"
          v-loading="loading"
          empty-text="暂无关注的股票"
        >
          <el-table-column prop="stockCode" label="代码" width="100"></el-table-column>
          <el-table-column prop="stockName" label="名称" width="150"></el-table-column>
          <el-table-column prop="notes" label="备注">
            <template #default="scope">
              <el-input
                v-if="editingNotes === scope.row.id"
                v-model="tempNotes"
                size="small"
                @blur="saveNotes(scope.row)"
                @keyup.enter="saveNotes(scope.row)"
              ></el-input>
              <div v-else @click="editNotes(scope.row)" class="notes-text">
                {{ scope.row.notes || '点击添加备注' }}
              </div>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="scope">
              <el-button
                type="text"
                size="small"
                @click="showStockDetail(scope.row.stockCode)"
              >
                查看
              </el-button>
              <el-button
                type="text"
                size="small"
                @click="removeStock(scope.row)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- 创建分组对话框 -->
    <el-dialog
      title="新建分组"
      v-model="createWatchlistDialogVisible"
      width="30%"
    >
      <el-form :model="watchlistForm" label-width="80px">
        <el-form-item label="分组名称" required>
          <el-input v-model="watchlistForm.name" placeholder="请输入分组名称"></el-input>
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="watchlistForm.description"
            type="textarea"
            placeholder="请输入分组描述"
          ></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="createWatchlistDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="createWatchlist" :loading="submitting">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 编辑分组对话框 -->
    <el-dialog
      title="编辑分组"
      v-model="editWatchlistDialogVisible"
      width="30%"
    >
      <el-form :model="watchlistForm" label-width="80px">
        <el-form-item label="分组名称" required>
          <el-input v-model="watchlistForm.name" placeholder="请输入分组名称"></el-input>
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="watchlistForm.description"
            type="textarea"
            placeholder="请输入分组描述"
          ></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editWatchlistDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="updateWatchlist" :loading="submitting">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 删除分组确认对话框 -->
    <el-dialog
      title="删除分组"
      v-model="deleteWatchlistDialogVisible"
      width="30%"
    >
      <p>确定要删除分组"{{ currentWatchlist?.name }}"吗？此操作不可恢复。</p>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="deleteWatchlistDialogVisible = false">取消</el-button>
          <el-button type="danger" @click="deleteWatchlist" :loading="submitting">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 添加股票对话框 -->
    <el-dialog
      title="添加关注股票"
      v-model="addStockDialogVisible"
      width="30%"
    >
      <el-form :model="stockForm" label-width="80px">
        <el-form-item label="股票代码" required>
          <el-input v-model="stockForm.stockCode" placeholder="请输入股票代码"></el-input>
        </el-form-item>
        <el-form-item label="股票名称" required>
          <el-input v-model="stockForm.stockName" placeholder="请输入股票名称"></el-input>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="stockForm.notes"
            type="textarea"
            placeholder="请输入备注"
          ></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="addStockDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="addStock" :loading="submitting">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getUserWatchlists,
  createWatchlist as apiCreateWatchlist,
  updateWatchlist as apiUpdateWatchlist,
  deleteWatchlist as apiDeleteWatchlist,
  getWatchlistItems,
  addStockToWatchlist,
  removeStockFromWatchlist,
  updateWatchlistItemNotes,
  Watchlist,
  WatchlistItem
} from '@/services/watchlistService'

export default defineComponent({
  name: 'WatchlistManager',
  setup() {
    const router = useRouter()
    const watchlists = ref<Watchlist[]>([])
    const watchlistItems = ref<{ [key: number]: WatchlistItem[] }>({})
    const activeWatchlist = ref('')
    const loading = ref(false)
    const submitting = ref(false)

    // 分组表单
    const watchlistForm = ref({
      id: 0,
      name: '',
      description: ''
    })

    // 股票表单
    const stockForm = ref({
      stockCode: '',
      stockName: '',
      notes: ''
    })

    // 对话框显示状态
    const createWatchlistDialogVisible = ref(false)
    const editWatchlistDialogVisible = ref(false)
    const deleteWatchlistDialogVisible = ref(false)
    const addStockDialogVisible = ref(false)

    // 备注编辑
    const editingNotes = ref(0)
    const tempNotes = ref('')

    // 当前选中的分组
    const currentWatchlist = computed(() => {
      return watchlists.value.find(w => w.id.toString() === activeWatchlist.value)
    })

    // 当前分组的股票列表
    const currentWatchlistItems = computed(() => {
      if (!activeWatchlist.value) return []
      const id = parseInt(activeWatchlist.value)
      return watchlistItems.value[id] || []
    })

    // 加载用户的关注分组
    const loadWatchlists = async () => {
      try {
        loading.value = true
        const data = await getUserWatchlists()
        watchlists.value = data
        if (data.length > 0 && !activeWatchlist.value) {
          activeWatchlist.value = data[0].id.toString()
          await loadWatchlistItems(data[0].id)
        }
      } catch (error) {
        ElMessage.error('获取关注分组失败')
        console.error(error)
      } finally {
        loading.value = false
      }
    }

    // 加载分组中的股票
    const loadWatchlistItems = async (watchlistId: number) => {
      try {
        loading.value = true
        const data = await getWatchlistItems(watchlistId)
        watchlistItems.value[watchlistId] = data
      } catch (error) {
        ElMessage.error('获取关注股票失败')
        console.error(error)
      } finally {
        loading.value = false
      }
    }

    // 切换分组
    const handleTabClick = async () => {
      if (activeWatchlist.value) {
        const id = parseInt(activeWatchlist.value)
        if (!watchlistItems.value[id]) {
          await loadWatchlistItems(id)
        }
      }
    }

    // 显示创建分组对话框
    const showCreateWatchlistDialog = () => {
      watchlistForm.value = {
        id: 0,
        name: '',
        description: ''
      }
      createWatchlistDialogVisible.value = true
    }

    // 创建分组
    const createWatchlist = async () => {
      if (!watchlistForm.value.name) {
        ElMessage.warning('请输入分组名称')
        return
      }

      try {
        submitting.value = true
        const data = await apiCreateWatchlist({
          name: watchlistForm.value.name,
          description: watchlistForm.value.description
        })
        watchlists.value.push(data)
        activeWatchlist.value = data.id.toString()
        watchlistItems.value[data.id] = []
        createWatchlistDialogVisible.value = false
        ElMessage.success('创建分组成功')
      } catch (error) {
        ElMessage.error('创建分组失败')
        console.error(error)
      } finally {
        submitting.value = false
      }
    }

    // 显示编辑分组对话框
    const showEditWatchlistDialog = (watchlist: Watchlist) => {
      watchlistForm.value = {
        id: watchlist.id,
        name: watchlist.name,
        description: watchlist.description || ''
      }
      editWatchlistDialogVisible.value = true
    }

    // 更新分组
    const updateWatchlist = async () => {
      if (!watchlistForm.value.name) {
        ElMessage.warning('请输入分组名称')
        return
      }

      try {
        submitting.value = true
        const data = await apiUpdateWatchlist(watchlistForm.value.id, {
          name: watchlistForm.value.name,
          description: watchlistForm.value.description
        })
        const index = watchlists.value.findIndex(w => w.id === data.id)
        if (index !== -1) {
          watchlists.value[index] = data
        }
        editWatchlistDialogVisible.value = false
        ElMessage.success('更新分组成功')
      } catch (error) {
        ElMessage.error('更新分组失败')
        console.error(error)
      } finally {
        submitting.value = false
      }
    }

    // 显示删除分组对话框
    const showDeleteWatchlistDialog = (watchlist: Watchlist) => {
      watchlistForm.value.id = watchlist.id
      deleteWatchlistDialogVisible.value = true
    }

    // 删除分组
    const deleteWatchlist = async () => {
      try {
        submitting.value = true
        await apiDeleteWatchlist(watchlistForm.value.id)
        const index = watchlists.value.findIndex(w => w.id === watchlistForm.value.id)
        if (index !== -1) {
          watchlists.value.splice(index, 1)
          delete watchlistItems.value[watchlistForm.value.id]
          if (watchlists.value.length > 0) {
            activeWatchlist.value = watchlists.value[0].id.toString()
          }
        }
        deleteWatchlistDialogVisible.value = false
        ElMessage.success('删除分组成功')
      } catch (error) {
        ElMessage.error('删除分组失败')
        console.error(error)
      } finally {
        submitting.value = false
      }
    }

    // 显示添加股票对话框
    const showAddStockDialog = () => {
      stockForm.value = {
        stockCode: '',
        stockName: '',
        notes: ''
      }
      addStockDialogVisible.value = true
    }

    // 添加股票
    const addStock = async () => {
      if (!stockForm.value.stockCode) {
        ElMessage.warning('请输入股票代码')
        return
      }
      if (!stockForm.value.stockName) {
        ElMessage.warning('请输入股票名称')
        return
      }

      try {
        submitting.value = true
        const watchlistId = parseInt(activeWatchlist.value)
        const data = await addStockToWatchlist(watchlistId, {
          stockCode: stockForm.value.stockCode,
          stockName: stockForm.value.stockName,
          notes: stockForm.value.notes
        })
        if (!watchlistItems.value[watchlistId]) {
          watchlistItems.value[watchlistId] = []
        }
        watchlistItems.value[watchlistId].push(data)
        addStockDialogVisible.value = false
        ElMessage.success('添加股票成功')
      } catch (error) {
        ElMessage.error('添加股票失败')
        console.error(error)
      } finally {
        submitting.value = false
      }
    }

    // 删除股票
    const removeStock = async (stock: WatchlistItem) => {
      try {
        await ElMessageBox.confirm(
          `确定要从关注列表中删除"${stock.stockName}"吗？`,
          '提示',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )

        const watchlistId = parseInt(activeWatchlist.value)
        await removeStockFromWatchlist(watchlistId, stock.id)
        const index = watchlistItems.value[watchlistId].findIndex(s => s.id === stock.id)
        if (index !== -1) {
          watchlistItems.value[watchlistId].splice(index, 1)
        }
        ElMessage.success('删除股票成功')
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('删除股票失败')
          console.error(error)
        }
      }
    }

    // 编辑备注
    const editNotes = (stock: WatchlistItem) => {
      editingNotes.value = stock.id
      tempNotes.value = stock.notes || ''
    }

    // 保存备注
    const saveNotes = async (stock: WatchlistItem) => {
      if (editingNotes.value === 0) return
      if (tempNotes.value === stock.notes) {
        editingNotes.value = 0
        return
      }

      try {
        const watchlistId = parseInt(activeWatchlist.value)
        const data = await updateWatchlistItemNotes(watchlistId, stock.id, tempNotes.value)
        const index = watchlistItems.value[watchlistId].findIndex(s => s.id === stock.id)
        if (index !== -1) {
          watchlistItems.value[watchlistId][index].notes = data.notes
        }
        editingNotes.value = 0
        ElMessage.success('更新备注成功')
      } catch (error) {
        ElMessage.error('更新备注失败')
        console.error(error)
      }
    }

    // 查看股票详情
    const showStockDetail = (stockCode: string) => {
      router.push(`/stock/${stockCode}`)
    }

    // 组件挂载时加载数据
    onMounted(() => {
      loadWatchlists()
    })

    return {
      watchlists,
      activeWatchlist,
      loading,
      submitting,
      watchlistForm,
      stockForm,
      createWatchlistDialogVisible,
      editWatchlistDialogVisible,
      deleteWatchlistDialogVisible,
      addStockDialogVisible,
      currentWatchlist,
      currentWatchlistItems,
      editingNotes,
      tempNotes,
      handleTabClick,
      showCreateWatchlistDialog,
      createWatchlist,
      showEditWatchlistDialog,
      updateWatchlist,
      showDeleteWatchlistDialog,
      deleteWatchlist,
      showAddStockDialog,
      addStock,
      removeStock,
      editNotes,
      saveNotes,
      showStockDetail
    }
  }
})
</script>

<style scoped>
.watchlist-manager {
  padding: 20px;
}

.watchlist-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.watchlist-actions {
  margin-bottom: 10px;
  display: flex;
  justify-content: flex-end;
}

.notes-text {
  cursor: pointer;
  min-height: 20px;
  color: #606266;
}

.notes-text:hover {
  color: #409EFF;
}
</style>
