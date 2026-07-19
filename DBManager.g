./**
 * ============================================================
 * CPL Ver1.0 ORIGIN
 * DBManager.gs
 * ------------------------------------------------------------
 * 責務：
 * DBシート管理
 *
 * ・保存
 * ・DB_SCHEMAに従って1行生成
 * ============================================================
 */

const DBManager = {

  /**
   * 保存
   */
  save(record) {

    const sheet = SheetManager.require(
      SHEETS.DB
    );

    sheet.appendRow(
      this.createRow(record)
    );

  },

  /**
   * 保存行生成
   */
  createRow(record) {

    return DB_SCHEMA.map(column =>
      this.getColumnValue(
        record,
        column
      )
    );

  },

  /**
   * カラム値取得
   */
  getColumnValue(
    record,
    column
  ) {

    switch (column.SOURCE) {

      case 'RACE':

        return this.getRaceValue(
          record,
          column
        );

      case 'HORSE':

        return this.getHorseValue(
          record,
          column
        );

      default:

        return '';

    }

  },

  /**
   * レース情報取得
   */
  getRaceValue(
    record,
    column
  ) {

    return record.raceInfo[
      column.KEY
    ] ?? '';

  },

  /**
   * 着順情報取得
   */
  getHorseValue(
    record,
    column
  ) {

    const horse =
      record.horses[
        column.RANK - 1
      ];

    if (!horse) {

      return '';

    }

    return horse[
      column.KEY
    ] ?? '';

  }

};