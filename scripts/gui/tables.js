gui.table = {};

gui.table.titleRow = function titleRow(table, lines) {
    let row = gui.element("tr", table);
    for (let line of lines) gui.text(line, gui.element("th", row));
    return row;
}

gui.table.textRow =  function textRow(table, lines) {
    let row = gui.element("tr", table);
    for (let line of lines) gui.text(line, gui.element("td", row));
    return row;
}

gui.table.row =  function row(table, nodes) {
    let row = gui.element("tr", table);
    for (let node of nodes) gui.element("td", row).appendChild(node);
    return row;
}