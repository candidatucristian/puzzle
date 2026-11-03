const copies = {
  en: {
    achievements: 'Achievements', unread: 'unread', index: 'IN THIS CHAPTER',
    earned: 'You earned this.', subtitle: 'A discovery worth keeping.', archive: 'THE ASHCOMBE ARCHIVE',
    presented: 'Presented to', recipient: 'Name on your diploma', placeholder: 'Your name',
    identityHelp: 'Use the name you want printed on your diploma.', save: 'Save name', saved: 'Name saved on this diploma.',
    nameRequired: 'Enter the name to be printed on your diploma.',
    issued: 'Unlocked on', certificate: 'Certificate of discovery', diploma: 'Your diploma', chapter: 'The field notes',
    downloadDiploma: 'Save diploma · PDF', downloadChapter: 'Save chapter · PDF', replay: 'Replay the delivery',
    openBook: "Open Decoder’s Book", continue: 'Continue exploring', close: 'Close',
    recognition: 'For recognising the Fibonacci sequence in the Moonlit Garden.',
    qualities: 'OBSERVATION  ·  PATTERN RECOGNITION  ·  REASONING',
    note: 'Your discovery is now part of Decoder’s Book.', reference: 'CERTIFICATE',
    unlocked: 'DISCOVERY RECORDED', collection: 'THE DECODER’S COLLECTION',
    error: 'The document could not be saved. Please try again.',
  },
  ro: {
    achievements: 'Realizări', unread: 'necitite', index: 'ÎN ACEST CAPITOL',
    earned: 'Ai obținut această distincție.', subtitle: 'O descoperire de păstrat.', archive: 'ARHIVA ASHCOMBE',
    presented: 'Se acordă lui', recipient: 'Numele de pe diplomă', placeholder: 'Numele tău',
    identityHelp: 'Alege numele care va fi tipărit pe diploma ta.', save: 'Salvează numele', saved: 'Numele a fost păstrat pe această diplomă.',
    nameRequired: 'Introdu numele care va fi tipărit pe diplomă.',
    issued: 'Deblocat la', certificate: 'Diplomă de descifrare', diploma: 'Diploma ta', chapter: 'Filele descoperirii',
    downloadDiploma: 'Salvează diploma · PDF', downloadChapter: 'Salvează capitolul · PDF', replay: 'Revezi sosirea',
    openBook: 'Deschide Decoder’s Book', continue: 'Continuă explorarea', close: 'Închide',
    recognition: 'Pentru recunoașterea șirului Fibonacci în Grădina luminată de lună.',
    qualities: 'OBSERVAȚIE  ·  RECUNOAȘTEREA TIPARELOR  ·  RAȚIONAMENT',
    note: 'Descoperirea ta face acum parte din Decoder’s Book.', reference: 'DIPLOMĂ',
    unlocked: 'DESCOPERIRE CONSEMNATĂ', collection: 'COLECȚIA DESCIFRATORULUI',
    error: 'Documentul nu a putut fi salvat. Încearcă din nou.',
  },
  ru: {
    achievements: 'Достижения', unread: 'непрочитано', index: 'В ЭТОЙ ГЛАВЕ',
    earned: 'Вы заслужили эту награду.', subtitle: 'Открытие, которое стоит сохранить.', archive: 'АРХИВ ЭШКОМБА',
    presented: 'Награждается', recipient: 'Имя на дипломе', placeholder: 'Ваше имя',
    identityHelp: 'Выберите имя, которое будет напечатано на дипломе.', save: 'Сохранить имя', saved: 'Имя сохранено на этом дипломе.',
    nameRequired: 'Введите имя для диплома.',
    issued: 'Получено', certificate: 'Диплом открытия', diploma: 'Ваш диплом', chapter: 'Записи об открытии',
    downloadDiploma: 'Сохранить диплом · PDF', downloadChapter: 'Сохранить главу · PDF', replay: 'Повторить доставку',
    openBook: 'Открыть Decoder’s Book', continue: 'Продолжить исследование', close: 'Закрыть',
    recognition: 'За распознавание последовательности Фибоначчи в Лунном саду.',
    qualities: 'НАБЛЮДЕНИЕ  ·  РАСПОЗНАВАНИЕ ЗАКОНОМЕРНОСТЕЙ  ·  РАССУЖДЕНИЕ',
    note: 'Ваше открытие стало частью Decoder’s Book.', reference: 'ДИПЛОМ',
    unlocked: 'ОТКРЫТИЕ ЗАПИСАНО', collection: 'КОЛЛЕКЦИЯ ИССЛЕДОВАТЕЛЯ',
    error: 'Не удалось сохранить документ. Попробуйте ещё раз.',
  },
};

export const getRewardCopy = language => copies[language] ?? copies.en;
export function earnedDate(entry, language) {
  return new Intl.DateTimeFormat(language, {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  }).format(new Date(entry.earnedAt));
}
