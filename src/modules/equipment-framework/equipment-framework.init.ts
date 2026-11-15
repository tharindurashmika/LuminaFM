import { equipmentModuleRegistry } from './equipment-module.registry';
import { BoilerEquipmentModule } from './modules/boiler/boiler.module';
import { ChillerEquipmentModule } from './modules/chiller/chiller.module';
import { logger } from '../../utils/logger';

/**
 * Initializes the LuminaFM Equipment Extensibility Framework
 * and pre-loads standard verified modules.
 */
export function initializeEquipmentFramework(): void {
  logger.info('[Equipment Framework] Initializing equipment module registry...');

  // 1. Register baseline verified Industrial Steam Boiler Module
  equipmentModuleRegistry.registerModule(BoilerEquipmentModule);

  // 2. Register demonstration Water-Cooled Chiller Module
  equipmentModuleRegistry.registerModule(ChillerEquipmentModule);

  logger.info(
    `[Equipment Framework] Initialization complete. ${equipmentModuleRegistry.listModules().length} modules active.`
  );
}
