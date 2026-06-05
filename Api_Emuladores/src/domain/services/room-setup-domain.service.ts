import type { RoomSetupDerived, RoomSetupInput } from "../types/room.types";
import { AppError } from "../../shared/errors/app-error";

export class RoomSetupDomainService {
  private static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(value, max));
  }

  validateSetup(setup: RoomSetupInput): void {
    const roomArea = setup.roomWidth * setup.roomLength;

    if (roomArea < 9 || roomArea > 300) {
      throw new AppError("Room area must be between 9 and 300 m2", 422, "ROOM_AREA_INVALID");
    }

    if (setup.windowCount < 0 || setup.windowCount > 6) {
      throw new AppError("Window count must be between 0 and 6", 422, "WINDOW_COUNT_INVALID");
    }

    if (setup.windowCount === 0 && setup.windowAreaTotal !== 0) {
      throw new AppError("windowAreaTotal must be 0 when windowCount is 0", 422, "WINDOW_AREA_INVALID");
    }

    if (setup.windowCount > 0 && setup.windowAreaTotal <= 0) {
      throw new AppError("windowAreaTotal must be > 0 when windowCount is greater than 0", 422, "WINDOW_AREA_REQUIRED");
    }

    if (setup.minisplitCount < 1 || setup.minisplitCount > 3) {
      throw new AppError("Minisplit count must be between 1 and 3", 422, "MINISPLIT_COUNT_INVALID");
    }

    if (setup.purifierCount < 1 || setup.purifierCount > 3) {
      throw new AppError("Purifier count must be between 1 and 3", 422, "PURIFIER_COUNT_INVALID");
    }

    if (setup.extractorCount < 1 || setup.extractorCount > 3) {
      throw new AppError("Extractor count must be between 1 and 3", 422, "EXTRACTOR_COUNT_INVALID");
    }

    const maxWindowArea = roomArea * 0.4;
    if (setup.windowAreaTotal > maxWindowArea) {
      throw new AppError("Window area cannot exceed 40% of room area", 422, "WINDOW_RATIO_INVALID");
    }
  }

  derive(setup: RoomSetupInput): RoomSetupDerived {
    const roomArea = setup.roomWidth * setup.roomLength;
    const windowAreaRatio = roomArea === 0 ? 0 : setup.windowAreaTotal / roomArea;
    const windowFactorBase = 1 + windowAreaRatio * 0.5;
    const windowFactor = RoomSetupDomainService.clamp(windowFactorBase, 1, 1.2);

    return {
      roomArea,
      windowAreaRatio,
      windowFactorBase,
      windowFactor,
      areaTermica: roomArea * windowFactor,
      areaCalidadAire: roomArea * (1 + windowAreaRatio * 0.3)
    };
  }
}
