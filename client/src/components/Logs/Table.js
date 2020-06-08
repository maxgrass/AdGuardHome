import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { withTranslation } from 'react-i18next';
import ReactTable from 'react-table';
import classNames from 'classnames';
import endsWith from 'lodash/endsWith';
import escapeRegExp from 'lodash/escapeRegExp';
import {
    isSmallScreen,
    BLOCK_ACTIONS,
    DEFAULT_SHORT_DATE_FORMAT_OPTIONS,
    LONG_TIME_FORMAT,
    REASON_TO_COLOR_CLASS_MAP,
    TABLE_DEFAULT_PAGE_SIZE,
    TRANSITION_TIMEOUT,
} from '../../helpers/constants';
import getDateCell from './Cells/getDateCell';
import getDomainCell from './Cells/getDomainCell';
import getClientCell from './Cells/getClientCell';
import getResponseCell from './Cells/getResponseCell';

import {
    checkFiltered,
    formatDateTime,
    formatElapsedMs,
    formatTime,
    REQ_STATUS_TO_LABEL_MAP,
} from '../../helpers/helpers';

const Table = (props) => {
    const {
        setDetailedDataCurrent,
        setButtonType,
        setModalOpened,
    } = props;

    useEffect(() => {
        props.setLoading(false);
    }, []);

    useEffect(() => {
        setTimeout(() => props.setLoading(false), TRANSITION_TIMEOUT);
    }, [props.page]);

    const toggleBlocking = (type, domain) => {
        const {
            t, setRules, getFilteringStatus, addSuccessToast,
        } = props;
        const { userRules } = props.filtering;

        const lineEnding = !endsWith(userRules, '\n') ? '\n' : '';
        const baseRule = `||${domain}^$important`;
        const baseUnblocking = `@@${baseRule}`;

        const blockingRule = type === BLOCK_ACTIONS.BLOCK ? baseUnblocking : baseRule;
        const unblockingRule = type === BLOCK_ACTIONS.BLOCK ? baseRule : baseUnblocking;
        const preparedBlockingRule = new RegExp(`(^|\n)${escapeRegExp(blockingRule)}($|\n)`);
        const preparedUnblockingRule = new RegExp(`(^|\n)${escapeRegExp(unblockingRule)}($|\n)`);

        const matchPreparedBlockingRule = userRules.match(preparedBlockingRule);
        const matchPreparedUnblockingRule = userRules.match(preparedUnblockingRule);

        if (matchPreparedBlockingRule) {
            setRules(userRules.replace(`${blockingRule}`, ''));
            addSuccessToast(`${t('rule_removed_from_custom_filtering_toast')}: ${blockingRule}`);
        } else if (!matchPreparedUnblockingRule) {
            setRules(`${userRules}${lineEnding}${unblockingRule}\n`);
            addSuccessToast(`${t('rule_added_to_custom_filtering_toast')}: ${unblockingRule}`);
        } else if (matchPreparedUnblockingRule) {
            addSuccessToast(`${t('rule_added_to_custom_filtering_toast')}: ${unblockingRule}`);
            return;
        } else if (!matchPreparedBlockingRule) {
            addSuccessToast(`${t('rule_removed_from_custom_filtering_toast')}: ${blockingRule}`);
            return;
        }

        getFilteringStatus();
    };

    const columns = [
        {
            Header: props.t('time_table_header'),
            accessor: 'time',
            Cell: (row) => getDateCell(row, props.isDetailed),
            minWidth: 62,
            maxHeight: 60,
            headerClassName: 'logs__text',
        },
        {
            Header: props.t('request_table_header'),
            accessor: 'domain',
            Cell: (row) => {
                const {
                    t,
                    isDetailed,
                    autoClients,
                    dnssec_enabled,
                } = props;

                return getDomainCell({
                    row,
                    t,
                    isDetailed,
                    toggleBlocking,
                    autoClients,
                    dnssec_enabled,
                });
            },
            minWidth: 180,
            maxHeight: 60,
            headerClassName: 'logs__text',
        },
        {
            Header: props.t('response_table_header'),
            accessor: 'response',
            Cell: (row) => getResponseCell(
                row,
                props.filtering,
                props.t,
                props.isDetailed,
            ),
            minWidth: 100,
            maxHeight: 60,
            headerClassName: 'logs__text',
        },
        {
            Header: () => {
                const plainSelected = classNames('cursor--pointer', {
                    'icon--selected': !props.isDetailed,
                });

                const detailedSelected = classNames('cursor--pointer', {
                    'icon--selected': props.isDetailed,
                });

                return <div className="d-flex justify-content-between">
                    {props.t('client_table_header')}
                    {<span>
                        <svg
                            className={`icons icon--small icon--active mr-2 cursor--pointer ${plainSelected}`}
                            onClick={() => props.toggleDetailedLogs(false)}>
                            <use xlinkHref='#list' />
                        </svg>
                    <svg
                        className={`icons icon--small icon--active cursor--pointer ${detailedSelected}`}
                        onClick={() => props.toggleDetailedLogs(true)}>
                        <use xlinkHref='#detailed_list' />
                    </svg>
                    </span>}
                </div>;
            },
            accessor: 'client',
            Cell: (row) => {
                const {
                    t,
                    isDetailed,
                    autoClients,
                    filtering: { processingRules },
                } = props;

                return getClientCell({
                    row,
                    t,
                    isDetailed,
                    toggleBlocking,
                    autoClients,
                    processingRules,
                });
            },
            minWidth: 123,
            maxHeight: 60,
            headerClassName: 'logs__text',
        },
    ];

    const fetchData = (state) => {
        const { pages } = state;
        const { oldest, page, getLogs } = props;
        const isLastPage = pages && (page + 1 === pages);

        if (isLastPage) {
            getLogs(oldest, page);
        }
    };

    const changePage = (page) => {
        props.setLoading(true);
        props.setLogsPage(page);
        props.setLogsPagination({
            page,
            pageSize: TABLE_DEFAULT_PAGE_SIZE,
        });
    };

    const {
        t,
        processingGetLogs,
        processingGetConfig,
        logs,
        pages,
        page,
    } = props;

    const isLoading = processingGetLogs || processingGetConfig || props.loading;

    const tableClass = classNames('logs__table', {
        'logs__table--detailed': props.isDetailed,
    });

    return (
        <ReactTable
            manual
            minRows={0}
            page={page}
            pages={pages}
            columns={columns}
            filterable={false}
            sortable={false}
            resizable={false}
            data={logs || []}
            loading={isLoading}
            showPageJump={false}
            showPageSizeOptions={false}
            onFetchData={fetchData}
            onPageChange={changePage}
            className={tableClass}
            defaultPageSize={TABLE_DEFAULT_PAGE_SIZE}
            loadingText={t('loading_table_status')}
            rowsText={t('rows_table_footer_text')}
            noDataText={!isLoading
            && <label className="logs__text logs__text--bold">{t('empty_log')}</label>}
            pageText=''
            ofText=''
            showPagination={logs.length > 0}
            getPaginationProps={() => ({ className: 'custom-pagination custom-pagination--padding' })}
            getTbodyProps={() => ({ className: 'd-block' })}
            previousText={
                <svg className="icons icon--small icon--gray w-100 h-100 cursor--pointer">
                    <use xlinkHref="#arrow-left" />
                </svg>}
            nextText={
                <svg className="icons icon--small icon--gray w-100 h-100 cursor--pointer">
                    <use xlinkHref="#arrow-right" />
                </svg>}
            renderTotalPagesCount={() => false}
            getTrGroupProps={(_state, rowInfo) => {
                if (!rowInfo) {
                    return {};
                }

                const { reason } = rowInfo.original;
                const colorClass = REASON_TO_COLOR_CLASS_MAP[reason] || 'white';

                return { className: colorClass };
            }}
            getTrProps={(state, rowInfo) => ({
                className: props.isDetailed ? 'row--detailed' : '',
                onClick: () => {
                    if (isSmallScreen) {
                        const { dnssec_enabled, autoClients } = props;
                        const {
                            answer_dnssec,
                            client,
                            domain,
                            elapsedMs,
                            info,
                            reason,
                            response,
                            time,
                            tracker,
                            upstream,
                        } = rowInfo.original;

                        const hasTracker = !!tracker;

                        const autoClient = autoClients.find(
                            (autoClient) => autoClient.name === client,
                        );

                        const country = autoClient && autoClient.whois_info
                            && autoClient.whois_info.country;

                        const network = autoClient && autoClient.whois_info
                            && autoClient.whois_info.orgname;
                        const formattedElapsedMs = formatElapsedMs(elapsedMs, t);
                        const isFiltered = checkFiltered(reason);

                        const buttonType = isFiltered ? BLOCK_ACTIONS.UNBLOCK : BLOCK_ACTIONS.BLOCK;
                        const onToggleBlock = () => {
                            toggleBlocking(buttonType, domain);
                        };

                        const source = tracker && tracker.sourceData && tracker.sourceData.name;

                        const status = t(REQ_STATUS_TO_LABEL_MAP[reason] || reason);
                        const statusBlocked = <div className="bg--danger">{status}</div>;

                        const detailedData = {
                            time_table_header: formatTime(time, LONG_TIME_FORMAT),
                            data: formatDateTime(time, DEFAULT_SHORT_DATE_FORMAT_OPTIONS),
                            encryption_status: status,
                            domain,
                            details: 'title',
                            install_settings_dns: upstream,
                            elapsed: formattedElapsedMs,
                            request_table_header: response && response.join('\n'),
                            client_details: 'title',
                            name: info && info.name,
                            ip_address: client,
                            country,
                            network,
                            validated_with_dnssec: dnssec_enabled ? Boolean(answer_dnssec) : false,
                            [buttonType]: <div onClick={onToggleBlock}
                                               className="title--border bg--danger">{t(buttonType)}</div>,
                        };

                        const detailedDataBlocked = {
                            time_table_header: formatTime(time, LONG_TIME_FORMAT),
                            data: formatDateTime(time, DEFAULT_SHORT_DATE_FORMAT_OPTIONS),
                            encryption_status: statusBlocked,
                            domain,
                            known_tracker: 'title',
                            table_name: hasTracker && tracker.name,
                            category_label: hasTracker && tracker.category,
                            source_label: source
                                && <a href={`//${source}`} className="link--green">{source}</a>,
                            details: 'title',
                            install_settings_dns: upstream,
                            elapsed: formattedElapsedMs,
                            request_table_header: response && response.join('\n'),
                            [buttonType]: <div onClick={onToggleBlock}
                                               className="title--border">{t(buttonType)}</div>,
                        };

                        const detailedDataCurrent = isFiltered ? detailedDataBlocked : detailedData;

                        setDetailedDataCurrent(detailedDataCurrent);
                        setButtonType(buttonType);
                        setModalOpened(true);
                    }
                },
            })}
        />
    );
};

Table.propTypes = {
    logs: PropTypes.array.isRequired,
    pages: PropTypes.number.isRequired,
    page: PropTypes.number.isRequired,
    autoClients: PropTypes.array.isRequired,
    defaultPageSize: PropTypes.number,
    oldest: PropTypes.string.isRequired,
    filtering: PropTypes.object.isRequired,
    processingGetLogs: PropTypes.bool.isRequired,
    processingGetConfig: PropTypes.bool.isRequired,
    isDetailed: PropTypes.bool.isRequired,
    setLogsPage: PropTypes.func.isRequired,
    setLogsPagination: PropTypes.func.isRequired,
    getLogs: PropTypes.func.isRequired,
    toggleDetailedLogs: PropTypes.func.isRequired,
    t: PropTypes.func.isRequired,
    setRules: PropTypes.func.isRequired,
    addSuccessToast: PropTypes.func.isRequired,
    getFilteringStatus: PropTypes.func.isRequired,
    loading: PropTypes.bool.isRequired,
    setLoading: PropTypes.func.isRequired,
    dnssec_enabled: PropTypes.bool.isRequired,
    setDetailedDataCurrent: PropTypes.func.isRequired,
    setButtonType: PropTypes.func.isRequired,
    setModalOpened: PropTypes.func.isRequired,
};

export default withTranslation()(Table);