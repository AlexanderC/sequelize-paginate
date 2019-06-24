'use strict'

/**
 * Class to paginate sequelite results.
 */
class SequelizePaginate {
  /** @typedef {import('sequelize').Model} Model */
  /**
   * Method to append paginate method to Model.
   *
   * @param {Model} Model - Sequelize Model.
   * @returns {*} -
   * @example
   * const sequelizePaginate = require('sequelize-paginate')
   *
   * sequelizePaginate.paginate(MyModel)
   */
  paginate (Model) {
    /**
     * @typedef {Object} Paginate Sequelize query options
     * @property {number} [paginate=25] Results per page
     * @property {number} [page=1] Number of page
     * @property {number} [keepAttrs=[]] List of attributes.include elements to keep
     */
    /**
     * @typedef {import('sequelize').FindOptions & Paginate} paginateOptions
     */
    /**
     * The paginate result
     * @typedef {Object} PaginateResult
     * @property {Array} docs Docs
     * @property {number} pages Number of page
     * @property {number} total Total of docs
     */
    /**
     * Pagination.
     *
     * @param {paginateOptions} [params] - Options to filter query.
     * @returns {Promise<PaginateResult>} Total pages and docs.
     * @example
     * const { docs, pages, total } = await MyModel.paginate({ page: 1, paginate: 25 })
     * @memberof Model
     */
    const pagination = async function ({
      page = 1,
      paginate = 25,
      keepAttrs = [],
      ...params
    } = {}) {
      const options = Object.assign({}, params)
      const countOptions = Object.keys(options).reduce((acc, key) => {
        if (!['order', 'include'].includes(key)) {
          if (key === 'attributes') {
              if (options.attributes.include && keepAttrs.length > 0) {
                  const includes = options.attributes.include.filter(
                      attrInc => keepAttrs.includes(attrInc[1])
                  );

                  if (includes)
                      acc.attributes = {
                          include: includes
                      }
              }
          } else {
              // eslint-disable-next-line security/detect-object-injection
              acc[key] = options[key]
          }
        }
        return acc
      }, {})

      let total;
      if (countOptions.attributes && countOptions.attributes.include) {

        // attributes.include is ignored by count(), so we manually correct
        // the select statement before using findAll (maybe a better option is possible ?)
        countOptions.attributes = countOptions.attributes.include;

        let query = this.sequelize.dialect.QueryGenerator.selectQuery(this.getTableName(), countOptions, this).slice(0, -1);
        query = `SELECT COUNT(*) as nb FROM (${query}) as total`;

        total = await this.sequelize.query(query , {
          type: this.sequelize.QueryTypes.SELECT,
          raw: true
        })

        if (total.length && ('nb' in total[0])) {
          total = total[0]['nb'];
        } else {
          console.warn('(sequelize-pagination) Warning: the count request returned unexpected value. Expected [ { total: <int> } ], received', total, 'with query', query);
        }

      } else
        total = await this.count(countOptions)

      if (options.group !== undefined && Array.isArray( total )) {
        // @ts-ignore
        total = total.length
      }

      const pages = Math.ceil(total / paginate)
      options.limit = paginate
      options.offset = paginate * (page - 1)
      /* eslint-disable no-console */
      if (params.limit) {
        console.warn(`(sequelize-pagination) Warning: limit option is ignored.`)
      }
      if (params.offset) {
        console.warn(
          `(sequelize-pagination) Warning: offset option is ignored.`
        )
      }
      /* eslint-enable no-console */
      if (params.order) options.order = params.order
      const docs = await this.findAll(options)
      return { docs, pages, total }
    }
    const instanceOrModel = Model.Instance || Model
    // @ts-ignore
    instanceOrModel.paginate = pagination
  }
}

module.exports = new SequelizePaginate()
