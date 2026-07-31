import { ModuleProvider, Modules } from '@medusajs/framework/utils'
import Przelewy24ProviderService from './service'

export default ModuleProvider(Modules.PAYMENT, {
  services: [Przelewy24ProviderService],
})
