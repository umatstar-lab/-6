<?php
namespace Joomla\Plugin\System\NoBreakTitles\Extension;

defined('_JEXEC') or die;

use Joomla\CMS\Event\Application\BeforeCompileHeadEvent;
use Joomla\CMS\Plugin\CMSPlugin;
use Joomla\CMS\Uri\Uri;
use Joomla\Event\SubscriberInterface;

final class NoBreakTitles extends CMSPlugin implements SubscriberInterface
{
    protected $autoloadLanguage = true;

    public static function getSubscribedEvents(): array
    {
        return [
            'onBeforeCompileHead' => 'onBeforeCompileHead',
        ];
    }

    public function onBeforeCompileHead(BeforeCompileHeadEvent $event): void
    {
        $app = $event->getApplication();

        if (!$app || !$app->isClient('site') || !$this->params->get('enabled', 1)) {
            return;
        }

        $document = $event->getDocument();

        if (!$document || $document->getType() !== 'html') {
            return;
        }

        $config = [
            'mode' => (string) $this->params->get('language_mode', 'auto'),
            'uk' => (string) $this->params->get('uk_words', 'в, у, з, із, зі, с, на, до, від, за, по, під, над, між, без, для, про, при, через, і, й, та, а, о, к'),
            'ru' => (string) $this->params->get('ru_words', 'в, во, у, из, изо, с, со, на, к, ко, от, до, за, по, под, над, между, без, для, про, при, через, и, а, но, о, об, обо, к'),
            'en' => (string) $this->params->get('en_words', 'a, an, the, in, on, at, by, for, from, of, to, into, with, without, and, or, but, nor'),
            'numberAbbr' => (string) $this->params->get('number_abbreviations', 'р., рр., г., гг.'),
            'abbr' => (string) $this->params->get('abbreviations', 'м., г., ул., вул., р-н, с., смт., д., им., ст., акад., проф., доц., тис., млн.'),
        ];

        $document->addScriptOptions('plg_system_nobreaktitles', $config);

        $document->getWebAssetManager()->registerAndUseScript(
            'plg_system_nobreaktitles',
            Uri::root(true) . '/media/plg_system_nobreaktitles/js/nobreaktitles.js',
            ['version' => '1.2.1'],
            ['defer' => true],
            ['core']
        );
    }
}
