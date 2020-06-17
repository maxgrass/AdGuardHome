import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTranslation, Trans } from 'react-i18next';
import ReactTable from 'react-table';
import classNames from 'classnames';
import endsWith from 'lodash/endsWith';
import escapeRegExp from 'lodash/escapeRegExp';
import {
    BLOCK_ACTIONS,
    DEFAULT_SHORT_DATE_FORMAT_OPTIONS,
    LONG_TIME_FORMAT,
    FILTERED_STATUS_TO_META_MAP,
    TABLE_DEFAULT_PAGE_SIZE,
    TRANSITION_TIMEOUT,
    SCHEME_TO_PROTOCOL_MAP,
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

} from '../../helpers/helpers';
import Loading from '../ui/Loading';

const Table = (props) => {
    const {
        setDetailedDataCurrent,
        setButtonType,
        setModalOpened,
        isSmallScreen,
        setIsLoading,
        filtering,
        isDetailed,
        toggleDetailedLogs,
        setLogsPage,
        setLogsPagination,
        processingGetLogs,
        logs,
        pages,
        page,
        isLoading,
    } = props;

    const [t] = useTranslation();

    useEffect(() => {
        setTimeout(() => setIsLoading(false), TRANSITION_TIMEOUT);
    }, [page]);

    const toggleBlocking = (type, domain) => {
        const {
            setRules, getFilteringStatus, addSuccessToast,
        } = props;
        const { userRules } = filtering;

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
            Header: t('time_table_header'),
            accessor: 'time',
            Cell: (row) => getDateCell(row, isDetailed),
            minWidth: 70,
            maxHeight: 60,
            headerClassName: 'logs__text',
        },
        {
            Header: t('request_table_header'),
            accessor: 'domain',
            Cell: (row) => {
                const {
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
            Header: t('response_table_header'),
            accessor: 'response',
            Cell: (row) => getResponseCell(
                row,
                filtering,
                t,
                isDetailed,
            ),
            minWidth: 150,
            maxHeight: 60,
            headerClassName: 'logs__text',
        },
        {
            Header: () => {
                const plainSelected = classNames('cursor--pointer', {
                    'icon--selected': !isDetailed,
                });

                const detailedSelected = classNames('cursor--pointer', {
                    'icon--selected': isDetailed,
                });

                return <div className="d-flex justify-content-between">
                    {t('client_table_header')}
                    {<span>
                        <svg
                            className={`icons icon--small icon--active mr-2 cursor--pointer ${plainSelected}`}
                            onClick={() => toggleDetailedLogs(false)}
                        >
                            <title><Trans>compact</Trans></title>
                            <use xlinkHref='#list' />
                        </svg>
                    <svg
                        className={`icons icon--small icon--active cursor--pointer ${detailedSelected}`}
                        onClick={() => toggleDetailedLogs(true)}
                    >
                        <title><Trans>default</Trans></title>
                        <use xlinkHref='#detailed_list' />
                    </svg>
                        </span>}
                </div>;
            },
            accessor: 'client',
            Cell: (row) => {
                const {
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
        setIsLoading(true);
        setLogsPage(page);
        setLogsPagination({
            page,
            pageSize: TABLE_DEFAULT_PAGE_SIZE,
        });
    };

    const tableClass = classNames('logs__table', {
        'logs__table--detailed': isDetailed,
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
            loadingText={
                <>
                    <Loading />
                    <h6 className="loading__text">{t('loading_table_status')}</h6>
                </>}
            getLoadingProps={() => ({ className: 'loading__container' })}
            rowsText={t('rows_table_footer_text')}
            noDataText={!processingGetLogs
            && <label className="logs__text logs__text--bold">{t('nothing_found')}</label>}
            pageText=''
            ofText=''
            showPagination={logs.length > 0}
            getPaginationProps={() => ({ className: 'custom-pagination custom-pagination--padding' })}
            getTbodyProps={() => ({ className: 'd-block' })}
            previousText={
                <svg className="icons icon--small icon--gray w-100 h-100 cursor--pointer">
                    <title><Trans>previous_btn</Trans></title>
                    <use xlinkHref="#arrow-left" />
                </svg>}
            nextText={
                <svg className="icons icon--small icon--gray w-100 h-100 cursor--pointer">
                    <title><Trans>next_btn</Trans></title>
                    <use xlinkHref="#arrow-right" />
                </svg>}
            renderTotalPagesCount={() => false}
            getTrGroupProps={(_state, rowInfo) => {
                if (!rowInfo) {
                    return {};
                }

                const { reason } = rowInfo.original;
                const colorClass = FILTERED_STATUS_TO_META_MAP[reason] ? FILTERED_STATUS_TO_META_MAP[reason].color : 'white';

                return { className: colorClass };
            }}
            getTrProps={(state, rowInfo) => ({
                className: isDetailed ? 'row--detailed' : '',
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
                            type,
                            client_proto,
                        } = rowInfo.original;

                        const hasTracker = !!tracker;

                        const autoClient = autoClients.find(
                            (autoClient) => autoClient.name === client,
                        );

                        const country = autoClient && autoClient.whois_info
                            && autoClient.whois_info.country;

                        const network = autoClient && autoClient.whois_info
                            && autoClient.whois_info.orgname;

                        const city = autoClient && autoClient.whois_info
                            && autoClient.whois_info.city;

                        const source = autoClient && autoClient.source;

                        const formattedElapsedMs = formatElapsedMs(elapsedMs, t);
                        const isFiltered = checkFiltered(reason);

                        const buttonType = isFiltered ? BLOCK_ACTIONS.UNBLOCK : BLOCK_ACTIONS.BLOCK;
                        const onToggleBlock = () => {
                            toggleBlocking(buttonType, domain);
                        };

                        const tracker_source = tracker && tracker.sourceData
                            && tracker.sourceData.name;

                        const status = t((FILTERED_STATUS_TO_META_MAP[reason]
                            && FILTERED_STATUS_TO_META_MAP[reason].label) || reason);
                        const statusBlocked = <div className="bg--danger">{status}</div>;

                        const protocol = t(SCHEME_TO_PROTOCOL_MAP[client_proto]) || '';

                        const detailedData = {
                            time_table_header: formatTime(time, LONG_TIME_FORMAT),
                            date: formatDateTime(time, DEFAULT_SHORT_DATE_FORMAT_OPTIONS),
                            encryption_status: status,
                            domain,
                            type_table_header: type,
                            protocol,
                            known_tracker: hasTracker && 'title',
                            table_name: hasTracker && tracker.name,
                            category_label: hasTracker && tracker.category,
                            tracker_source: hasTracker && tracker_source && <a href={`//${source}`}
                                                                               className="link--green">{tracker_source}</a>,
                            response_details: 'title',
                            install_settings_dns: upstream,
                            elapsed: formattedElapsedMs,
                            response_table_header: response && response.join('\n'),
                            client_details: 'title',
                            ip_address: client,
                            name: info && info.name,
                            country,
                            city,
                            network,
                            source_label: source,
                            validated_with_dnssec: dnssec_enabled ? Boolean(answer_dnssec) : false,
                            [buttonType]: <div onClick={onToggleBlock}
                                               className="title--border bg--danger">{t(buttonType)}</div>,
                        };

                        const detailedDataBlocked = {
                            time_table_header: formatTime(time, LONG_TIME_FORMAT),
                            date: formatDateTime(time, DEFAULT_SHORT_DATE_FORMAT_OPTIONS),
                            encryption_status: statusBlocked,
                            domain,
                            type_table_header: type,
                            protocol,
                            known_tracker: 'title',
                            table_name: hasTracker && tracker.name,
                            category_label: hasTracker && tracker.category,
                            source_label: hasTracker && source
                                && <a href={`//${source}`} className="link--green">{source}</a>,
                            response_details: 'title',
                            install_settings_dns: upstream,
                            elapsed: formattedElapsedMs,
                            response_table_header: response && response.join('\n'),
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
    setRules: PropTypes.func.isRequired,
    addSuccessToast: PropTypes.func.isRequired,
    getFilteringStatus: PropTypes.func.isRequired,
    isLoading: PropTypes.bool.isRequired,
    setIsLoading: PropTypes.func.isRequired,
    dnssec_enabled: PropTypes.bool.isRequired,
    setDetailedDataCurrent: PropTypes.func.isRequired,
    setButtonType: PropTypes.func.isRequired,
    setModalOpened: PropTypes.func.isRequired,
    isSmallScreen: PropTypes.bool.isRequired,
};

export default Table;
