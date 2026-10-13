<?php
require_once __DIR__.'/logs_base.php';
class CookieConsentLogsExportProcessor extends CookieConsentLogsProcessor {
    protected function execute(): array {
        @set_time_limit(120);$reader=$this->reader();$filters=$this->filters();$snapshot=$reader->snapshot($filters);$summary=$reader->query($filters,'',$snapshot);
        $setting=$this->modx->getObject('modSystemSetting',['key'=>'manager_language']);$labels=CookieConsentTexts::lexicon($setting?(string)$setting->get('value'):'en')?:CookieConsentTexts::lexicon('en');
        while(ob_get_level())ob_end_clean();
        header('Content-Type: text/csv; charset=UTF-8');header('X-Content-Type-Options: nosniff');header('Cache-Control: private, no-store');
        header('Content-Disposition: attachment; filename="cookie-consent-'.($filters['year']==='all'?'all':$filters['year']).'.csv"');
        $warnings=$summary['invalid']+$summary['unknown_fields'];header('X-CookieConsent-Audit-Warnings: '.$warnings);header('X-CookieConsent-Audit-Count: '.$summary['total']);
        $output=fopen('php://output','wb');
        try{$count=$reader->csv($output,$filters,$snapshot,$labels,$warnings);if($count!==$summary['total']&&!connection_aborted())throw new RuntimeException('logs_changed');}
        catch(Throwable $e){$this->modx->log(modX::LOG_LEVEL_ERROR,'[CookieConsentViewer] CSV interrupted; exported file is incomplete.');fputcsv($output,[$labels['m.log_export_incomplete']??'Export incomplete'], ';','"','');}
        finally{fclose($output);}exit;
    }
}
return 'CookieConsentLogsExportProcessor';
