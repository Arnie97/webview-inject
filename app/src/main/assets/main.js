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
                $('<td>').append($('<a>').attr('href', url).text(info.emu_no))
            ).appendTo(table);
        });
        (innerWidth > 400) && $('td,th').css('padding', '0 30px');

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
    var trainNumbers = trainNodes.map(function(index, node) {
        return node.dataset.trainno;
    }).toArray();

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

    switch (page[0]) {
    case 'init':
        setTrainTypePicker();
        setTrainAndDatePicker('departTime');
        break;

    case 'initCC':
        setTrainAndDatePicker('checi_dt');
        break;

    case 'ysqcx':
        location.pathname = location.pathname.replace('ysqcx', 'qssj');
        return;

    case 'qssj':
        setHeaderIFrame();
        break;

    case 'detail':
    case 'showcc':
        // fix the weird hidden button
        $('.ChmoreBtn').parent().height('auto');

        observeMutation('.TnListInfo', function() {
            showTerminalStations();
            showTrainDetails();
        });
        break;

    case 'query':
        observeMutation('#searchSingleTicketResultList', checkPage);
        break;

    default:
        if (location.hostname === 'moerail.ml') {
            $('header,footer').hide();
        }
        return;
    }

    return pageAgnosticCustomize();
}

function pageAgnosticCustomize() {
    // Session storage persistence
    observeMutation('#indexPage', function(watch) {
        if (watch.css('display') !== 'hidden') {
            Object.
                keys(sessionStorage).
                filter(function(k) { return !/_(result|info)$/.test(k); }).
                forEach(function(k) { localStorage[k] = sessionStorage[k]; });
        }
    }, {attributes: true});

    $('.bottom-tips').empty();

    // choose a sane background color for the station picker
    $('.ui-header').addClass('top-prompt-contain');

    // add QR code scanner button in the footer
    $('.footerNav>:nth-child(3)>a').
        text('扫码查询').
        removeAttr('href').
        click(function () {
            moerail.startQRCodeScanner();
        });
}

function observeMutation(selector, callback, options) {
    var watch = $(selector);
    callback(watch);
    var observer = new MutationObserver(function() {
        callback(watch, arguments);
    });
    watch.each(function() {
        observer.observe(this, options || {childList: true});
    });
}

function setTrainTypePicker() {
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
}

function setTrainAndDatePicker(dateStorageKey) {
    // invalidate the outdated default value
    if ($('#J_no').val() === '24000000G10G') {
        $('#J_checi').val(null);
    }

    // if the last used date is valid, do not change it
    if (sessionStorage[dateStorageKey] >= new Date().kxString()) {
        return;
    }

    // otherwise, change the default date to tomorrow
    var tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    $('#JpSearchMonthWeek').text(tomorrow.kxString());
}

function setHeaderIFrame() {
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
}

// Submit unknown QR codes to the server and render the results
function explainQRCode(qrCode, explain) {
    explain = explain || $('<div class="ui-section">').
        text(qrCode).
        css({'padding': 16, 'line-height': 1.5, 'word-break': 'break-word'});

    var message = $('<div>').css('line-height', 2.5).appendTo(explain);
    var ajaxSettings = {
        type: 'POST',
        url: 'https://api.moerail.ml/emu/@/qr',
        data: JSON.stringify({url: qrCode}),
        contentType: false,
        beforeSend: popLoading,
        complete: cancelLoading,
        success: function(results) {
            explainQRCodeSuccessCallback(message, results);
        },
        error: function(_, textStatus, error) {
            explainQRCodeErrorCallback(message, error || textStatus, qrCode);
        },
    };
    try {
        $.ajax(ajaxSettings);
    } catch (e) {
        ajaxSettings.error(null, e);
    }

    explain = explainQRCodeTicket(qrCode) || explain;
    return explain.
        insertAfter('.query-page>article>:last-child')[0].
        scrollIntoView();
}

function explainQRCodeSuccessCallback(message, results) {
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
            $('<td>').append($('<a>').attr('href', url).text(info.train_no))
        ).appendTo(tbody);
    });

    $('<div>').
        text(formatTrainModel(results[0]).emu_no).
        css({'font-size': '18px', 'font-weight': 'bold'}).
        prependTo(message.parent())[0].
        scrollIntoView();
}

function explainQRCodeErrorCallback(message, errorStatus, qrCode) {
    cancelLoading();
    message.
        text('查询失败（' + errorStatus + '），点此重试').
        click(function() {
            explainQRCode(qrCode, $(this).parent().text(qrCode));
        });
}

function explainQRCodeTicket(qrCode) {
    if (!/^\d{144}-\w{16}.{8}\w{66}.{10,20}\d{7}$|^[A-Z]\d{10,13}[A-Z]\d{6}$/.test(qrCode)) {
        return;
    }
    return $('<iframe allowtransparency>').
        attr('src', 'https://moerail.ml/ticket/#' + qrCode).
        css('border', 'none').
        width('100%').
        height(270);
}

customize();
