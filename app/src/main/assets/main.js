var colors = [
    ['#F80', /CRH6/],
    ['#C01', /AF/],
    ['#C84', /BF/],
    ['#080', /J/],
    ['#39d', /CR/],
];

// Patch items on the list page
function showTrainModel(node, info) {
    var arrow = $(node).find('.ticket-right-arrow');
    arrow.css('margin', '-8px 0px 3px');
    var label = $('<div>').text(info.emu_no);
    label.addClass('ticket-duration').insertBefore(arrow);
    colors.some(function(pair) {
        if (pair[1].test(info.emu_no)) {
            label.css('color', pair[0]);
            return true;
        }
    });
}

// Patch items on the details page
function showTrainDetails() {
    showTerminalStations();
    var trainNumber = $('.ticket-no').text();
    if (trainNumber === '--') {
        return;
    }

    var url = 'https://api.moerail.ml/train/' + trainNumber;
    $.getJSON(url, function(results) {
        var tableCell = function(text) {
            return $('<div>').addClass('TnListTx_1').text(text).css('padding-left', '7px');
        };
        var table = $('<ul>').addClass('TnListInfo').append(
            $('<li>').addClass('TnListHd').append(
                tableCell('日期'),
                tableCell('车底'))).appendTo('.detail-scroller');

        results.forEach(function(info) {
            var match = info.emu_no.match(/^(\w+)(\d{4})$/);
            if (match) {
                info.emu_no = match[1] + "-" + match[2];
            }

            var url = 'https://moerail.ml/#' + info.emu_no;
            $('<li>').addClass('TnListLiTx').append(
                tableCell(info.date),
                $('<a>').attr('href', url).append(tableCell(info.emu_no))
            ).appendTo(table);
        });

        if (results.length) {
            $('.-detail-title').text(trainNumber + ' (' + results[0].emu_no + ')');
        }
    });
}

// Show the first and the last station in the timetable on the diagram
function showTerminalStations() {
    var cells = $('.TnListLiTx span');
    if (!cells.length) {
        return;
    }
    cells.at = function(index) {
        return this[index < 0? index + this.length: index];
    };
    showStation(cells, 0, 2, '.from-station');
    showStation(cells, -4, -3, '.to-station');
}

function showStation(cells, name, time, selector) {
    var tag = cells.at(name).lastChild.textContent;
    tag += '<br>' + cells.at(time).textContent;
    $(selector).css('top', '-36px').html(tag);
}

// Iterate through the items
function checkPage(trainList) {
    var trainNodes = trainList.children();
    var trainNumbers = Array.from(trainNodes.map(function(index, node) {
        return $(node).attr('data-trainno');
    }));

    popLoading();

    var url = 'https://api.moerail.ml/train/,' + trainNumbers.join(',');
    $.getJSON(url, function(results) {
        console.log('EMU Tools: ' + results.length + '/' + trainNumbers.length + ' found');

        // Convert array to map
        var trains = {};
        results.forEach(function(info) {
            trains[info.train_no] = info;
        });

        trainNodes.each(function(index, node) {
            var info = trains[trainNumbers[index]];
            if (info) {
                showTrainModel(node, info);
            }
        });

        cancelLoading();
    });
}

// Event handler for the back button: try to close date or city pickers
function goBack() {
    var backButton = $('.ui-header-back>a').filter(function(i) {
        return this.clientWidth;
    });
    return backButton.click().length;
}

// Optimize page layouts
function customize() {
    var page = location.pathname.match(/\w+$/) || [];
    switch (page[0]) {
    case 'init':
        var trainTypes = $('#traintypelist');
        var option = trainTypes.children().last();
        trainTypes.empty();

        var moreTypes = {
            QB: '全部',
            GDC: '动车',
            Z: '直特',
            T: '特快',
            K: '快速',
            QT: '其他',
        };
        for (var key in moreTypes) {
            option.
                clone().
                attr('data-value', key).
                text(moreTypes[key]).
                appendTo(trainTypes);
        }
        selectTrainType(trainTypes.children()[1]);
        // fallthrough

    case 'initCC':
        // change the default date to tomorrow
        if (!sessionStorage.getItem('departTime')) {
            var tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            $('#JpSearchMonthWeek').text(tomorrow.kxString());
            $('#J_no').val(function (_, value) {
                if (value == '24000000G10G') {
                    return value.slice(0, -1) + 'I';
                }
            });
        }
        break;

    case 'ysqcx':
    case 'qssj':
        $('<iframe>').
            attr('src', 'ysqcx').
            css('border', 'none').
            width('100%').
            height(200).
            insertBefore('.query-page>:first-child').
            on('load', function() {
                var innerDoc = $(this.contentDocument);
                innerDoc.find('.footerNav').remove();
                innerDoc.find('.ui-title').addClass('top-prompt-contain');
            });
        break;

    case 'detail':
    case 'showcc':
        var details = $('.TnListInfo');
        $('.ticket-line').each(showTrainDetails);
        var observer = new MutationObserver(function() {
            return $('.ticket-line').each(showTrainDetails);
        });
        observer.observe(details[0], {childList: true});
        break;

    case 'query':
        var trainList = $('#searchSingleTicketResultList');
        checkPage(trainList);
        var observer = new MutationObserver(function() {
            return checkPage(trainList);
        });
        observer.observe(trainList[0], {childList: true});
        break;

    default:
        return;
    }

    $('.bottom-tips').empty();

    // choose a sane background color for the station picker
    $('.ui-header').addClass('top-prompt-contain');

    $('.footerNav>:nth-child(3)>a').
        text('扫码查询').
        removeAttr('href').
        click(function () {
            moerail.startQRCodeScanner();
        });
}

// Submit unknown QR codes to the server and render the results
function explainQRCode(qrCode) {
    var explain = $('<div>').
        addClass('ui-section').
        css('padding', 16).
        text(qrCode);

    if (/^\d{144}-/.test(qrCode)) {
        explain = $('<iframe allowtransparency>').
            attr('src', 'https://moerail.ml/ticket/#' + qrCode).
            css('border', 'none').
            width('100%').
            height(270);
    }

    return explain.
        insertAfter('.query-page>article>:last-child')[0].
        scrollIntoView();
}

customize();
