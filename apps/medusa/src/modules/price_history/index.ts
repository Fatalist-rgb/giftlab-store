import { Module } from '@medusajs/framework/utils'
import PriceHistoryModuleService from './service'

export const PRICE_HISTORY_MODULE = 'price_history'

export default Module(PRICE_HISTORY_MODULE, {
  service: PriceHistoryModuleService,
})
