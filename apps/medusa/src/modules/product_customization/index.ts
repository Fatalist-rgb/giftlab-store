import { Module } from '@medusajs/framework/utils'
import ProductCustomizationModuleService from './service'

export const PRODUCT_CUSTOMIZATION_MODULE = 'product_customization'

export default Module(PRODUCT_CUSTOMIZATION_MODULE, {
  service: ProductCustomizationModuleService,
})
