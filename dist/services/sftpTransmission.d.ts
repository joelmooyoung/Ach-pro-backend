export declare class SFTPTransmissionService {
    static transmitNACHAFile(nachaFileId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    static scheduleTransmission(nachaFileId: string, scheduledTime?: Date): Promise<void>;
    static retryFailedTransmissions(): Promise<void>;
}
//# sourceMappingURL=sftpTransmission.d.ts.map