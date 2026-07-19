import { Module } from '@medusajs/framework/utils'
import ConsentModuleService from './service'

export const CONSENT_MODULE = 'consent'

export default Module(CONSENT_MODULE, {
  service: ConsentModuleService,
})
