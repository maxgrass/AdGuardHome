import React from 'react';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import { nanoid } from 'nanoid';
import getHintElement from './getHintElement';
import { SCHEME_TO_PROTOCOL_MAP } from '../../../helpers/constants';

const getDomainCell = (props) => {
    const {
        row, t, isDetailed, dnssec_enabled,
    } = props;

    const {
        tracker, type, answer_dnssec, client_proto, domain,
    } = row.original;

    const hasTracker = !!tracker;

    const source = tracker && tracker.sourceData && tracker.sourceData.name;

    const lockIconClass = classNames('icons', 'icon--small', 'd-none', 'd-sm-block', 'cursor--pointer', {
        'icon--active': answer_dnssec,
        'icon--disabled': !answer_dnssec,
        'my-3': isDetailed,
    });

    const privacyIconClass = classNames('icons', 'mx-2', 'icon--small', 'd-none', 'd-sm-block', 'cursor--pointer', {
        'icon--active': hasTracker,
        'icon--disabled': !hasTracker,
        'my-3': isDetailed,
    });

    const dnssecHint = getHintElement({
        className: lockIconClass,
        tooltipClass: 'py-4 px-5 pb-45',
        dataTip: answer_dnssec,
        xlinkHref: 'lock',
        columnClass: 'w-100',
        content: 'validated_with_dnssec',
        place: 'bottom',
    });

    const protocol = t(SCHEME_TO_PROTOCOL_MAP[client_proto]) || '';
    const ip = type ? `${t('type_table_header')}: ${type}` : '';

    const requestDetailsObj = {
        domain,
        type_table_header: type,
        protocol,
    };

    const knownTrackerDataObj = {
        name_table_header: tracker && tracker.name,
        category_label: tracker && tracker.category,
        source_label: source && <a href={`//${source}`} className="link--green">{source}</a>,
    };

    const renderGrid = (content) => <div key={nanoid()}
                                         className='text-pre text-truncate key-colon o-hidden'>{typeof content === 'string' ? t(content) : content}</div>;

    const getGrid = (contentObj, title, className) => [
        <div key={title}
             className={classNames('pb-2 grid--title', className)}>{t(title)}</div>,
        <div key={nanoid()}
             className="grid">{React.Children.map(Object.entries(contentObj), renderGrid)}</div>,
    ];

    const requestDetails = getGrid(requestDetailsObj, 'request_details');

    const renderContent = hasTracker ? requestDetails.concat(getGrid(knownTrackerDataObj, 'known_tracker', 'pt-4')) : requestDetails;

    const trackerHint = getHintElement({
        className: privacyIconClass,
        tooltipClass: 'pt-4 pb-5 px-5',
        dataTip: true,
        xlinkHref: 'privacy',
        contentItemClass: 'key-colon',
        renderContent,
        place: 'bottom',
    });

    const valueClass = classNames('w-100', {
        'px-2 d-flex justify-content-center flex-column': isDetailed,
    });

    const details = [ip, protocol].filter(Boolean)
        .join(', ');

    return (
        <div className="logs__row o-hidden">
            {dnssec_enabled && dnssecHint}
            {trackerHint}
            <div className={valueClass}>
                <div className="text-truncate" title={domain}>{domain}</div>
                {details && isDetailed
                && <div className="detailed-info d-none d-sm-block text-truncate"
                     title={details}>{details}</div>}
            </div>
        </div>
    );
};

getDomainCell.propTypes = {
    row: PropTypes.object.isRequired,
    t: PropTypes.func.isRequired,
    isDetailed: PropTypes.bool.isRequired,
    toggleBlocking: PropTypes.func.isRequired,
    autoClients: PropTypes.array.isRequired,
    dnssec_enabled: PropTypes.bool.isRequired,
};

export default getDomainCell;
