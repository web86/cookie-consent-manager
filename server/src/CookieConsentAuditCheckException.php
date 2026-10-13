<?php
declare(strict_types=1);
/** Only bounded diagnostics cross the Manager connector; never transport bodies/errors. */
final class CookieConsentAuditCheckException extends RuntimeException
{
    public readonly int $receiverStatus;
    public readonly string $receiverCode;
    public function __construct(string $reason,int $status=0,string $receiverCode='') {
        parent::__construct($reason);
        $this->receiverStatus=$status>=100&&$status<=599?$status:0;
        $this->receiverCode=in_array($receiverCode,['origin_forbidden','invalid_payload','duplicate_event','rate_limited','audit_unavailable','method_not_allowed','unsupported_media_type','payload_too_large'],true)?$receiverCode:'';
    }
}
