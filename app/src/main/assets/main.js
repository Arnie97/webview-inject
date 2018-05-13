// Patch items on the web page
// Return 1 for unknown trains, 2 for found ones and 3 for inferred ones
function showTrainModel() {
    var arrow = $(this).find('.ticket-right-arrow');
    arrow.css('margin', '-8px 0px 3px');
    var train_code = $(this).attr('data-trainno');
    var model = getTrainModel(train_code);
    var label = $('<div>').html(model? model[0]: '&nbsp;');
    label.addClass('ticket-duration').insertBefore(arrow);
    return (!model)? 1: model[1]? 2: 3;
}

// Patch items on the details page
function showTrainDetails() {
    var train_code = $(this).find('.ticket-no').text();
    var model = getTrainModel(train_code);
    if (!model) {
        return;
    } else if (model[1]) {
        var url = 'https://moerail.ml/img/' + train_code + '.png';
        var img = $('<img>').attr('src', url);
        var link = $('<a>').attr('href', url);
        img.width('100%').css('border-top', '1px solid #e0e0e0');
        link.css('display', 'block').append(img).insertAfter(this);
    }
    $('.-detail-title').text(train_code + ' (' + model[0] + ')');
}

// Iterate through the items
function checkPage(trains_list) {
    var result = trains_list.children().map(showTrainModel);
    var count = [result.length, 0, 0, 0];
    result.each(function(i, x) {
        count[x]++;
    });

    var msg = 'EMU Tools: {0} checked, {2} found, {3} inferred';
    console.log(msg.replace(/{(\d+)}/g, function(match, number) {
        return count[number];
    }));
}

// Register the event listener
function main(json_object) {
    models = json_object;
    patterns = models[':'] || {};
    delete models[':'];

    $('#download').remove();
    var details = $('.-detail-date');
    if (details.length) {
        $('.ticket-line').each(showTrainDetails);
        var observer = new MutationObserver(function() {
            return $('.ticket-line').each(showTrainDetails);
        });
        observer.observe(details[0], {childList: true});
    }
    var trains_list = $('#searchSingleTicketResultList');
    if (trains_list.length) {
        checkPage(trains_list);
        var observer = new MutationObserver(function() {
            return checkPage(trains_list);
        });
        observer.observe(trains_list[0], {childList: true});
    }
}

$.getJSON('https://moerail.ml/models.json', main);
