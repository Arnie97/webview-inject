$('#searchSingleTicketResultList>li').each(function() {
    var arrow = $(this).find('.ticket-right-arrow');
    arrow.css('margin', '-8px 0px 3px');
    var train_code = $(this).attr('data-trainno');
    var label = $('<div>').text(train_code);
    label.addClass('ticket-duration').insertBefore(arrow);
});
