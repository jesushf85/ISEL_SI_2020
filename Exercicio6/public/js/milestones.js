$(document).ready(function (){  
})

function addDate(milestoneId)
{
    var milestoneDataObj = {}
    var milestoneElements = $('td#' + milestoneId + ' > span')
    for (var index = 0; index < milestoneElements.length - 1; index += 2)
    {
        var label = milestoneElements[index].textContent.replace(':','')
        var data = milestoneElements[index + 1].textContent
        milestoneDataObj[label] = data
    }

    $.ajax({
        type: "POST",
        url: 'http://' + window.location.host + '/addEventToCalendar',
        data: milestoneDataObj,
        success: function () { alert('Event added successfully')}
    })

    console.log(milestoneDataObj)
}