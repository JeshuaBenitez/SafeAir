package com.safeair.emulator.integration.api;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

import com.safeair.emulator.api.client.ApiStorageClient;
import com.safeair.emulator.api.dto.DtoSetup;

/**
 * Integration tests for API storage setup retrieval contract.
 * 
 * @see com.safeair.emulator.api.client.ApiStorageClient
 * @see com.safeair.emulator.api.dto.DtoSetup
 */
@SpringBootTest
class ApiStorageClientIntegrationTest {
    
    private ApiStorageClient apiStorageClient;
    
    @BeforeEach
    @SuppressWarnings("unused")
    void setUp() {
        apiStorageClient = new ApiStorageClient();
    }
    
    /**
     * Test that getSetup returns valid DtoSetup for any emulator ID.
     */
    @Test
    void getSetup_withValidEmulatorId_returnsValidDtoSetup() {
        // Given
        String emulatorId = "EMU-0001";
        
        // When
        DtoSetup result = apiStorageClient.getSetup(emulatorId);
        
        // Then
        assertThat(result).isNotNull();
        assertThat(result.emulatorId()).isEqualTo(emulatorId);
        assertThat(result.updateIntervalSec()).isPositive();
        assertThat(result.roomSquareMeters()).isPositive();
        assertThat(result.windowCount()).isGreaterThanOrEqualTo(0);
        assertThat(result.sensorTypes()).isNotNull();
        assertThat(result.deviceTypes()).isNotNull();
    }
    
    /**
     * Test that getSetup preserves ID identity in returned setup.
     */
    @Test
    void getSetup_preservesIdIdentity() {
        // Given
        String specificId = "EMU-0142";
        
        // When
        DtoSetup result = apiStorageClient.getSetup(specificId);
        
        // Then
        assertThat(result.emulatorId()).isEqualTo(specificId);
    }
    
    /**
     * Test that getSetup returns consistent default values as per placeholder implementation
     */
    @Test
    void getSetup_returnsExpectedPlaceholderValues() {
        // Given
        String emulatorId = "EMU-0007";
        
        // When
        DtoSetup result = apiStorageClient.getSetup(emulatorId);
        
        // Then - Testing current placeholder implementation
        assertThat(result.updateIntervalSec()).isEqualTo(1);
        assertThat(result.roomSquareMeters()).isEqualTo(35);
        assertThat(result.windowCount()).isEqualTo(0);
        assertThat(result.sensorTypes()).containsExactly(1, 2, 3, 4);
        assertThat(result.deviceTypes()).containsExactly(1, 2, 3);
    }
    
    /**
     * Test API client contract compliance - no null return values
     */
    @Test
    void getSetup_neverReturnsNull() {
        // Given multiple different IDs
        String[] testIds = {
            "EMU-0001",
            "EMU-0002",
            "EMU-9999"
        };
        
        for (String emulatorId : testIds) {
            // When
            DtoSetup result = apiStorageClient.getSetup(emulatorId);
            
            // Then
            assertThat(result).isNotNull();
            assertThat(result.emulatorId()).isEqualTo(emulatorId);
        }
    }
}