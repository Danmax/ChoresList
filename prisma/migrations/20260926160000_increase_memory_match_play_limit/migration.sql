UPDATE `GameSetting`
SET `dailyPlayLimit` = 8
WHERE `gameKey` = 'memory-match'
  AND `dailyPlayLimit` = 3;
