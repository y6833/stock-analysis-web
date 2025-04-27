import mitt from 'mitt'
import type { DataSourceType } from '@/services/dataSource/DataSourceFactory'

// 定义事件类型
type Events = {
  'data-source-changed': DataSourceType
  'data-source-cache-cleared': DataSourceType
}

// 创建事件总线
const eventBus = mitt<Events>()

export default eventBus
