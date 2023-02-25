var colors = [
    ['#F70', /6A/],
    ['#E58', /6F-?A/],
    ['#F10', /Z/],
    ['#C01', /AF/],
    ['#C84', /BF/],
    ['#080', /0J/],
    ['#39D', /CR/],
];

// Cache-Control: max-age=3600, overrides WebSettings.LOAD_CACHE_ELSE_NETWORK
var cacheControl = '?t=' + new Date().toISOString().slice(0, 13);

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

// Create a table with header cells
function tableHeader() {
    var header = $('<tr>');
    [].slice.call(arguments).forEach(function(text) {
        $('<th>').text(text).appendTo(header);
    });
    return $('<table>').
        css('width', '100%').
        prepend($('<thead>').css('line-height', 2.5).append(header));
}

// Add hyphens properly
function formatTrainModel(info) {
    [
        /^(\w+)(\d{4})$/,
        /^(\w+F)(\w+-\d{4})$/,
    ].forEach(function(regExp) {
        var match = info.emu_no.match(regExp);
        if (match) {
            info.emu_no = match[1] + "-" + match[2];
        }
    });
    return info;
}

// Patch items on the details page
function showTrainDetails() {
    showTerminalStations();
    var trainNumber = $('.ticket-no').text();
    if (trainNumber === '--') {
        return;
    }

    var url = 'https://api.moerail.ml/train/' + trainNumber + cacheControl;
    $.getJSON(url, function(results) {
        var table = tableHeader('日期', '车组号').
            appendTo('.detail-scroller');
        styleCopy(table, '.TnListInfo li', 'line-height');
        styleCopy(table.children(), '.TnListInfo li.TnListHd', 'background', 'border');

        results.forEach(function(info) {
            formatTrainModel(info);
            var url = 'https://moerail.ml/#' + info.emu_no;
            $('<tr>').append(
                $('<td>').text(info.date),
                $('<td>').append($('<a>').attr('href', url).text(info.emu_no)),
            ).appendTo(table);
        });
        $('td,th').css('padding', '0 30px');

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

    var url = 'https://api.moerail.ml/train/,' + trainNumbers.join(',') + cacheControl;
    $.getJSON(url, function(results) {
        console.log('EMU Tools: ' + results.length + '/' + trainNumbers.length + ' found');

        // Convert array to map
        var trains = {};
        results.forEach(function(info) {
            trains[info.train_no] = formatTrainModel(info);
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

// Copy stylesheets from src to dest
function styleCopy(dest, src) {
    if ('string' === typeof dest) {
        dest = $(dest);
    }
    if ('string' === typeof src) {
        src = $(src);
    }
    [].slice.call(arguments).forEach(function(key) {
        dest.css(key, src.css(key));
    });
}

// Optimize page layouts
function customize() {
    var page = location.pathname.match(/\w+$/) || [];
    var dateStorageKey = 'checi_dt';

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
        dateStorageKey = 'departTime';
        // fallthrough

    case 'initCC':
        if (sessionStorage[dateStorageKey] >= new Date().kxString()) {
            break;
        }

        // change the default date to tomorrow
        var tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        $('#JpSearchMonthWeek').text(tomorrow.kxString());

        // invalidate the outdated default value
        if ($('#J_no').val() === '24000000G10G') {
            $('#J_checi').val(null);
        }
        break;

    case 'ysqcx':
        location.pathname = location.pathname.replace('ysqcx', 'qssj');
        return;

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
        // fix the weird hidden button
        $('.ChmoreBtn').parent().height('auto');

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
        if (location.hostname === 'moerail.ml') {
            $('header,footer').hide();
        }
        return;
    }

    // Session storage persistence
    var observer = new MutationObserver(function() {
        setTimeout(function() {
            Object.
                keys(sessionStorage).
                filter(function(k) { return !/_(result|info)$/.test(k); }).
                forEach(function(k) { localStorage[k] = sessionStorage[k]; });
        }, 1);
    });
    $('#J_depart_code,#J_arrival_code,#J_no').each(function() {
        observer.observe(this, {attributes: true});
    });

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
function explainQRCode(qrCode, explain) {
    if (!explain) {
        explain = $('<div>').
            text(qrCode).
            addClass('ui-section').
            css({'padding': 16, 'line-height': 1.5, 'word-break': 'break-word'});
    }
    var message = $('<div>').css('line-height', 2.5).appendTo(explain);
    var ajaxSettings = {
        type: 'POST',
        url: 'https://api.moerail.ml/emu/@/qr',
        data: JSON.stringify({url: qrCode}),
        contentType: false,
        beforeSend: popLoading,
        complete: cancelLoading,
        success: function(results) {
            if (results.length === 0) {
                message.text('查询完成，未找到动车组运用信息');
                return;
            }

            var tbody = $('<tbody>').
                css('line-height', 1.5).
                appendTo(tableHeader('日期', '车次').appendTo(message));
            results.forEach(function(info) {
                var url = 'https://moerail.ml/#' + info.train_no;
                $('<tr>').append(
                    $('<td>').text(info.date),
                    $('<td>').append($('<a>').attr('href', url).text(info.train_no)),
                ).appendTo(tbody);
            });
            $('<div>').
                text(formatTrainModel(results[0]).emu_no).
                css({'font-size': '18px', 'font-weight': 'bold'}).
                prependTo(explain)[0].
                scrollIntoView();
        },
        error: function(_, textStatus, errorThrown) {
            message.
                text('查询失败（' + (errorThrown || textStatus) + '），点此重试').
                click(function() {
                    explainQRCode(qrCode, $(this).parent().text(qrCode));
                });
        },
    };
    try {
        $.ajax(ajaxSettings);
    } catch (e) {
        cancelLoading();
        ajaxSettings.error(null, e);
    }

    if (/^\d{144}-\w{16}.{8}\w{66}.{10,20}\d{7}$|^[A-Z]\d{10,13}[A-Z]\d{6}$/.test(qrCode)) {
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
