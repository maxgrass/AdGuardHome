import React from 'react';
import classNames from 'classnames';
import { formatElapsedMs } from '../../../helpers/helpers';
import {
    CUSTOM_FILTERING_RULES_ID,
    FILTERED_STATUS,
    FILTERED_STATUS_TO_META_MAP,
} from '../../../helpers/constants';
import getHintElement from './getHintElement';

const getFilterName = (filters, whitelistFilters, filterId, t) => {
    if (filterId === CUSTOM_FILTERING_RULES_ID) {
        return t('custom_filter_rules');
    }

    const filter = filters.find((filter) => filter.id === filterId)
        || whitelistFilters.find((filter) => filter.id === filterId);
    let filterName = '';

    if (filter) {
        filterName = filter.name;
    }

    if (!filterName) {
        filterName = t('unknown_filter', { filterId });
    }

    return filterName;
};

const getResponseCell = (row, filtering, t, isDetailed) => {
    const {
        reason, filterId, rule, status, upstream, elapsedMs, domain, response,
    } = row.original;

    const { filters, whitelistFilters } = filtering;
    const formattedElapsedMs = formatElapsedMs(elapsedMs, t);

    const statusLabel = t((FILTERED_STATUS_TO_META_MAP[reason]
        && FILTERED_STATUS_TO_META_MAP[reason].label) || reason);
    const boldStatusLabel = <span className="font-weight-bold">{statusLabel}</span>;
    const filter = getFilterName(filters, whitelistFilters, filterId, t);

    const renderResponses = (responseArr) => {
        if (responseArr.length === 0) {
            return '';
        }

        return <div>{responseArr.map((response) => {
            const className = classNames('white-space--nowrap', {
                'white-space--normal': response.length > 100,
            });

            return <div key={response} className={className}>{`${response}\n`}</div>;
        })}</div>;
    };

    const FILTERED_STATUS_TO_FIELDS_MAP = {
        [FILTERED_STATUS.NOT_FILTERED_NOT_FOUND]: {
            domain,
            encryption_status: boldStatusLabel,
            install_settings_dns: upstream,
            elapsed: formattedElapsedMs,
            response_table_header: renderResponses(response),
        },
        [FILTERED_STATUS.FILTERED_BLOCKED_SERVICE]: {
            domain,
            encryption_status: boldStatusLabel,
            filter,
            rule_label: rule,
            response_table_header: status,
        },
        [FILTERED_STATUS.FILTERED_SAFE_SEARCH]: {
            domain,
            encryption_status: boldStatusLabel,
            install_settings_dns: upstream,
            elapsed: formattedElapsedMs,
        },
        [FILTERED_STATUS.FILTERED_BLACK_LIST]: {
            domain,
            encryption_status: boldStatusLabel,
            install_settings_dns: upstream,
            elapsed: formattedElapsedMs,
        },
    };

    const fields = FILTERED_STATUS_TO_FIELDS_MAP[reason]
        ? Object.entries(FILTERED_STATUS_TO_FIELDS_MAP[reason])
        : Object.entries(FILTERED_STATUS_TO_FIELDS_MAP.NotFilteredNotFound);

    const detailedInfo = reason === FILTERED_STATUS.FILTERED_BLOCKED_SERVICE
    || reason === FILTERED_STATUS.FILTERED_BLACK_LIST
        ? filter : formattedElapsedMs;

    return (
        <div className="logs__row">
            {fields && getHintElement({
                className: classNames('icons mr-4 icon--small cursor--pointer icon--light-gray', { 'my-3': isDetailed }),
                columnClass: 'grid grid--limited',
                tooltipClass: 'px-5 pb-5 pt-4 mw-75 custom-tooltip__response-details',
                contentItemClass: 'text-truncate key-colon o-hidden',
                dataTip: true,
                xlinkHref: 'question',
                title: 'response_details',
                content: fields,
                place: 'bottom',
            })}
            <div className="text-truncate">
                <div className="text-truncate" title={statusLabel}>{statusLabel}</div>
                {isDetailed && <div
                    className="detailed-info d-none d-sm-block pt-1 text-truncate" title={detailedInfo}>{detailedInfo}</div>}
            </div>
        </div>
    );
};

export default getResponseCell;
