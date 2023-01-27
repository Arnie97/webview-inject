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

        $('.seat-price-detail').empty();
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

function printTicketInfo(info) {
    if (info && info.length >= 110) {
        var delimiters = [
            00, 00, 07, 10, 13,
            16, 16, 24, 26, 27, 29,
            33, 33, 38, 46, 47, 49,
            50, 50, 60,
            68, 68, 70, 72, 90, -7
        ];
        info = delimiters.map(function(element, index, array) {
            return info.slice(array[index], array[index+1]) || '<hr>';
        }).join(' ');
    }
    $('.bottom-tips').html(info);
}

// Watch for DOM tree changes
function main() {
    var details = $('.TnListInfo');
    if (details.length) {
        $('.ticket-line').each(showTrainDetails);
        var observer = new MutationObserver(function() {
            return $('.ticket-line').each(showTrainDetails);
        });
        observer.observe(details[0], {childList: true});
    }

    var trainList = $('#searchSingleTicketResultList');
    if (trainList.length) {
        checkPage(trainList);
        var observer = new MutationObserver(function() {
            return checkPage(trainList);
        });
        observer.observe(trainList[0], {childList: true});
    }
}

// Optimize page layouts
function customize() {
    var bgc = 'background-color';
    $('.ui-header').css(bgc, $('.station-search').css(bgc));
    $('.bottom-tips').html(null);

    // change the default date to tomorrow
    if (!sessionStorage.getItem('departTime')) {
        var tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        $('#JpSearchMonthWeek').text(tomorrow.kxString());
    }

    var trainTypes = $('#traintypelist');
    if (!trainTypes.length) {  // not the index page
        return main();
    }
    var option = trainTypes.children().last();
    trainTypes.empty();
    var types = {
        QB: '全部',
        GDC: '动车',
        Z: '直特',
        T: '特快',
        K: '快速',
        QT: '其他',
    };
    for (var key in types) {
        option = option.clone().attr('data-value', key).text(types[key]);
        trainTypes.append(option);
    }
    selectTrainType(trainTypes.children()[1]);
}

customize();
