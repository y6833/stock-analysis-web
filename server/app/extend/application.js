'use strict'

const DataValidator = require('../util/data_validator')
const DataTransformer = require('../util/data_transformer')

module.exports = {
  /**
   * 数据验证器实例
   * @member {DataValidator} Application#dataValidator
   */
  get dataValidator() {
    if (!this[Symbol.for('Application#dataValidator')]) {
      this[Symbol.for('Application#dataValidator')] = new DataValidator(this)
    }
    return this[Symbol.for('Application#dataValidator')]
  },

  /**
   * 数据转换器实例
   * @member {DataTransformer} Application#dataTransformer
   */
  get dataTransformer() {
    if (!this[Symbol.for('Application#dataTransformer')]) {
      this[Symbol.for('Application#dataTransformer')] = new DataTransformer(this)
    }
    return this[Symbol.for('Application#dataTransformer')]
  },
}
