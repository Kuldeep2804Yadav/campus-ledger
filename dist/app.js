'use strict';

const expenseCategories = {
  Food: '#7857e7', Transport: '#35a98c', Education: '#edac50',
  Shopping: '#ed769d', Entertainment: '#4a87df', Other: '#8d91a9'
};
const incomeCategories = ['Allowance', 'Part-time work', 'Scholarship', 'Other'];
const pages = {
  overview: ['Spending overview', 'See where your money goes each month.'],
  transactions: ['Transactions', 'Log income and expenses, then find entries by name, type, or category.'],
  budgets: ['Monthly budgets', 'Set a spending limit for each category and see how much you have left.'],
  reports: ['Spending reports', 'Compare your monthly totals and see which categories cost the most.']
};
const icons = {
  wallet: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 8V6l13-3v3m5 5h-6a2 2 0 0 0 0 4h6"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  chart: '<path d="M4 4v16h16m-12-4v-3m5 3V8m5 8V5"/>',
  lock: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  income: '<path d="m4 17 6-6 4 4 6-9m-6 0h6v6"/>',
  expense: '<path d="m4 7 6 6 4-4 6 9m-6 0h6v-6"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M5 16v5h14v-5"/>',
  edit: '<path d="m5 15 11-11 4 4L9 19l-5 1zM14 6l4 4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5"/>'
};
const currency = new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2,minimumFractionDigits:0});
const storageKey = 'campus-ledger-v1';
const today = new Date();
const monthControl = document.querySelector('#month');
const content = document.querySelector('#content');
const transactionDialog = document.querySelector('#transaction-dialog');
const transactionForm = document.querySelector('#transaction-form');
const transactionFields = transactionForm.elements;
const deleteDialog = document.querySelector('#delete-dialog');
const dateText = new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',year:'numeric'});
const monthText = new Intl.DateTimeFormat('en-IN',{month:'long',year:'numeric'});
let editingId = null;
let deleteId = null;
let noticeTimer;

function isoDate(date) {
  const pad = value => String(value).padStart(2,'0');
  return [date.getFullYear(),pad(date.getMonth()+1),pad(date.getDate())].join('-');
}

function relativeMonth(month, shift) {
  const [year, number] = month.split('-').map(Number);
  const date = new Date(year,number-1+shift,1);
  return String(date.getFullYear()).padStart(4,'0')+'-'+isoDate(date).slice(-5,-3);
}

function parseDate(date) {
  return new Date(date + 'T00:00:00');
}

function demoData() {
  const demoMonth = isoDate(today).slice(0,7);
  const items = [
    ['Monthly allowance','income','Allowance',9000,1],
    ['Freelance design','income','Part-time work',2200,10],
    ['Campus café','expense','Food',360,15],
    ['Metro pass','expense','Transport',950,12],
    ['Semester books','expense','Education',2280,11],
    ['Stationery kit','expense','Education',420,7],
    ['Movie night','expense','Entertainment',640,9],
    ['Hostel groceries','expense','Food',1380,5],
    ['College backpack','expense','Shopping',1190,3]
  ];
  const demoRows = items.map(([description,type,category,amount,day],index) => ({
    id:'demo-'+index,description,type,category,amount:amount*100,
    date:demoMonth+'-'+String(Math.min(day,today.getDate())).padStart(2,'0')
  }));
  [0.79,0.89,0.70,0.98,0.82].forEach((ratio,index) => {
    const month = relativeMonth(demoMonth,index-5);
    demoRows.push(
      {id:'past-income-'+index,description:'Monthly allowance',type:'income',category:'Allowance',amount:(8500+index*400)*100,date:month+'-01'},
      {id:'past-expense-'+index,description:'Food and groceries',type:'expense',category:'Food',amount:Math.round(3000*ratio)*100,date:month+'-10'},
      {id:'past-study-'+index,description:'Class materials',type:'expense',category:'Education',amount:Math.round(4300*ratio)*100,date:month+'-15'}
    );
  });
  return {transactions:demoRows,budgets:{[demoMonth]:{Food:240000,Transport:150000,Education:280000,Shopping:100000,Entertainment:100000}}};
}

function notify(message) {
  clearTimeout(noticeTimer);
  const notice = document.querySelector('#notice');
  notice.textContent = message;
  noticeTimer = setTimeout(() => { notice.textContent = ''; },4300);
}

let state;
try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  state = saved ?? demoData();
} catch {
  state = demoData();
  notify('Saved data is unavailable in this browser.');
}

function commit(next, message) {
  try {
    localStorage.setItem(storageKey,JSON.stringify(next));
  } catch {
    notify('Could not save. Check that browser storage is available.');
    return false;
  }
  state = next;
  notify(message);
  return true;
}

const money = paise => currency.format(paise/100);
const icon = name => '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+icons[name]+'</svg>';
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const options = categories => categories.map(category => `<option>${category}</option>`).join('');
const legend = (name, color) => `<span class="legend"><span class="dot" style="--dot:${color}"></span>${name}</span>`;

monthControl.value = isoDate(today).slice(0,7);
document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });

function monthRows(month = monthControl.value) {
  return state.transactions.filter(row => row.date.startsWith(month+'-')).sort((a,b) => b.date.localeCompare(a.date));
}

function totals(rows) {
  return rows.reduce((sum,row) => {
    sum[row.type] += row.amount;
    return sum;
  },{income:0,expense:0});
}

function breakdown(rows) {
  return Object.entries(expenseCategories).map(([category,color]) => ({
    category,color,amount:rows.reduce((sum,row) => row.type === 'expense' && row.category === category ? sum+row.amount : sum,0)
  })).sort((a,b) => b.amount-a.amount);
}

function metric(label,kind,amount,detail,iconName) {
  return `<section class="metric ${kind}"><div class="metric-top"><span class="tile" data-icon>${icon(iconName)}</span>${label}</div><div class="metric-value">${money(amount)}</div><small>${detail}</small></section>`;
}

function metrics(rows) {
  const {income,expense} = totals(rows);
  return `<div class="metrics">
    ${metric('Monthly balance','balance',income-expense,'Monthly income minus expenses','wallet')}
    ${metric('Total income','income',income,'Income this month','income')}
    ${metric('Total expenses','expense',expense,'Spending this month','expense')}
  </div>`;
}

function trend() {
  const period = Array.from({length:6},(_,index) => relativeMonth(monthControl.value,index-5));
  const data = period.map(month => ({label:monthText.format(parseDate(month+'-01')),...totals(monthRows(month))}));
  const highest = Math.max(1,...data.flatMap(entry => [entry.income,entry.expense]));
  return `<section class="panel"><div class="panel-head"><div><h2>Cash flow</h2><p class="subtle">Six months ending in the selected month</p></div>
    <div class="legends">${legend('Income','#55c3a1')}${legend('Expenses','#7857e7')}</div></div>
    <div class="bar-chart"><div class="plot">${data.map(entry => {
      const title = `${entry.label}, income ${money(entry.income)}, expenses ${money(entry.expense)}`;
      return `<div class="bar-pair" role="img" aria-label="${title}" title="${title}"><span class="bar inflow" style="--height:${entry.income/highest*93}%"></span><span class="bar" style="--height:${entry.expense/highest*93}%"></span></div>`;
    }).join('')}</div><div class="plot-labels" aria-hidden="true">${data.map(entry => `<span>${entry.label.slice(0,3)}</span>`).join('')}</div></div></section>`;
}

function spending(rows) {
  const categories = breakdown(rows).filter(item => item.amount > 0);
  const total = totals(rows).expense;
  let end = 0;
  const segments = categories.map(({color,amount}) => {
    const start = end;
    end += amount/total*100;
    return `${color} ${start}% ${Math.min(100,end)}%`;
  });
  return `<section class="panel"><div class="panel-head"><div><h2>Spending by category</h2><p class="subtle">${monthText.format(parseDate(monthControl.value+'-01'))}</p></div></div>
    <div class="donut-block"><div class="donut" style="--segments:${total ? 'conic-gradient('+segments.join(',')+')' : '#eeedf5'}"><div class="donut-center"><strong>${money(total)}</strong><span>Total spent</span></div></div>
    <div class="category-list">${categories.length ? categories.map(({category,color,amount}) => `<span class="legend"><span class="dot" style="--dot:${color}"></span>${category}<strong>${Math.round(amount/total*100)}%</strong></span>`).join('') : '<p class="subtle">No expenses this month.</p>'}</div></div></section>`;
}

function table(rows, editable) {
  if (!rows.length) return '<p class="empty">No matching transactions.</p>';
  return `<table><thead><tr><th scope="col">Description</th><th scope="col">Category</th><th scope="col">Date</th><th scope="col">Amount</th>${editable ? '<th scope="col">Actions</th>' : ''}</tr></thead><tbody>
    ${rows.map(row => `<tr><td>${escapeHTML(row.description)}</td><td><span class="chip">${escapeHTML(row.category)}</span></td><td>${dateText.format(parseDate(row.date))}</td><td class="amount ${row.type==='income' ? 'positive' : 'negative'}">${row.type==='income' ? '+' : '−'}${money(row.amount)}</td>
    ${editable ? `<td class="row-actions"><button class="icon-button" data-edit="${escapeHTML(row.id)}" aria-label="Edit ${escapeHTML(row.description)}" title="Edit transaction"><span data-icon>${icon('edit')}</span></button><button class="icon-button" data-delete="${escapeHTML(row.id)}" aria-label="Delete ${escapeHTML(row.description)}" title="Delete transaction"><span data-icon>${icon('trash')}</span></button></td>` : ''}</tr>`).join('')}
    </tbody></table>`;
}

function overview(rows) {
  return `${metrics(rows)}<div class="panels">${trend()}${spending(rows)}</div>
    <section class="panel"><div class="panel-head"><h2>Recent transactions</h2><a href="#transactions" class="text-link">View all</a></div><div class="table-wrap" id="transactions-table">${table(rows.slice(0,5),false)}</div></section>`;
}

function transactions(rows) {
  const categories = [...new Set([...Object.keys(expenseCategories),...incomeCategories])].sort();
  return `<section class="panel"><div class="panel-head"><h2>Transaction list</h2><button class="button secondary" id="export"><span data-icon>${icon('download')}</span>Export CSV</button></div>
    <div class="filters"><label>Search<input id="search" type="search" placeholder="Search descriptions"></label>
    <label>Type<select id="filter-type"><option value="">All types</option><option value="income">Income</option><option value="expense">Expense</option></select></label>
    <label>Category<select id="filter-category"><option value="">All categories</option>${options(categories)}</select></label></div>
    <div class="table-wrap" id="transactions-table">${table(rows,true)}</div></section>`;
}

function budgets(rows) {
  const limits = state.budgets[monthControl.value] ?? {};
  return `<div class="budget-grid">${breakdown(rows).map(({category,amount}) => {
    const limit = limits[category];
    const remaining = limit-amount;
    const over = limit && remaining < 0;
    let status = 'No limit set';
    if (limit) status = over ? `${money(-remaining)} over budget` : `${money(remaining)} remaining`;
    return `<section class="panel budget-card ${over ? 'over' : ''}"><h2>${category}</h2><p><strong>${money(amount)}</strong> ${limit ? `of ${money(limit)}` : 'spent'}</p>
      ${limit ? `<progress value="${Math.min(amount,limit)}" max="${limit}" aria-label="${category} budget used"></progress>` : ''}<span class="budget-state">${status}</span></section>`;
  }).join('')}</div>
  <section class="panel"><div class="panel-head"><div><h2>Set category limits</h2><p class="subtle">Leave a field blank to remove its limit.</p></div></div>
  <form id="budget-form"><div class="edit-budgets">${Object.keys(expenseCategories).map(category => `<label>${category} (₹)<input type="number" name="${category}" min="0.01" max="99999999" step="0.01" value="${limits[category] ? limits[category]/100 : ''}" placeholder="No limit"></label>`).join('')}</div><button class="button primary">Save budgets</button></form></section>`;
}

function reports(rows) {
  const total = totals(rows).expense;
  return `<div class="panels">${trend()}${spending(rows)}</div><section class="panel"><div class="panel-head"><h2>Category totals</h2><button class="button secondary" id="export"><span data-icon>${icon('download')}</span>Export CSV</button></div>
    <div class="table-wrap"><table class="report-table"><thead><tr><th scope="col">Category</th><th scope="col">Spent</th><th scope="col">Share</th></tr></thead>
    <tbody>${breakdown(rows).map(({category,amount}) => `<tr><td>${category}</td><td>${money(amount)}</td><td>${total ? (amount/total*100).toFixed(1) : 0}%</td></tr>`).join('')}</tbody></table></div></section>`;
}

function downloadCSV(rows) {
  if (!rows.length) {
    notify('There are no matching transactions to export.');
    return;
  }
  const csvCell = (value, isText = true) => {
    let cell = String(value);
    if (isText && /^[=+\-@\t\r\n]/.test(cell.trimStart())) cell = "'" + cell;
    return '"' + cell.replaceAll('"','""') + '"';
  };
  const lines = rows.map(row => [csvCell(row.date),csvCell(row.type),csvCell(row.category),csvCell(row.description),csvCell((row.amount/100).toFixed(2),false)].join(','));
  const file = new Blob(['\ufeff', ['Date,Type,Category,Description,Amount (INR)',...lines].join('\r\n')],{type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'campus-ledger-'+monthControl.value+'.csv';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url),1000);
  notify('CSV exported.');
}

function currentPage() {
  const page = location.hash.slice(1);
  return Object.hasOwn(pages,page) ? page : 'overview';
}

function filteredRows(rows) {
  const query = document.querySelector('#search').value.trim().toLowerCase();
  const type = document.querySelector('#filter-type').value;
  const category = document.querySelector('#filter-category').value;
  return rows.filter(row => row.description.toLowerCase().includes(query) && (!type || type === row.type) && (!category || category === row.category));
}

function render() {
  const page = currentPage();
  const rows = monthRows();
  const views = {overview,transactions,budgets,reports};
  document.querySelectorAll('nav a').forEach(link => {
    if (link.dataset.page === page) link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
  });
  document.querySelector('#section-name').textContent = page.charAt(0).toUpperCase()+page.slice(1);
  content.innerHTML = `<div class="intro"><h1>${pages[page][0]}</h1><p>${pages[page][1]}</p></div>${views[page](rows)}`;
  if (page === 'transactions') {
    const update = () => { document.querySelector('#transactions-table').innerHTML = table(filteredRows(rows),true); };
    document.querySelector('#search').addEventListener('input',update);
    document.querySelector('#filter-type').addEventListener('change',update);
    document.querySelector('#filter-category').addEventListener('change',update);
  }
  document.querySelector('#export')?.addEventListener('click',() => downloadCSV(page === 'transactions' ? filteredRows(rows) : rows));
  document.querySelector('#budget-form')?.addEventListener('submit',event => {
    event.preventDefault();
    const fields = new FormData(event.target);
    const limits = {};
    fields.forEach((value,key) => { if (value) limits[key] = Math.round(Number(value)*100); });
    if (commit({...state,budgets:{...state.budgets,[monthControl.value]:limits}},'Monthly budgets saved.')) render();
  });
}

function chooseCategories() {
  const categories = transactionFields.type.value === 'income' ? incomeCategories : Object.keys(expenseCategories);
  transactionFields.category.innerHTML = options(categories);
}

function openTransaction(row) {
  transactionForm.reset();
  editingId = row?.id ?? null;
  document.querySelector('#transaction-heading').textContent = row ? 'Edit transaction' : 'Add transaction';
  transactionFields.type.value = row?.type ?? 'expense';
  chooseCategories();
  transactionFields.description.value = row?.description ?? '';
  transactionFields.description.setCustomValidity('');
  transactionFields.amount.value = row ? row.amount/100 : '';
  const now = isoDate(new Date());
  transactionFields.date.value = row?.date ?? (now.startsWith(monthControl.value+'-') ? now : monthControl.value+'-01');
  if (row) transactionFields.category.value = row.category;
  transactionDialog.showModal();
  transactionFields.description.focus();
}

transactionFields.type.addEventListener('change',chooseCategories);
transactionFields.description.addEventListener('input',() => transactionFields.description.setCustomValidity(''));
document.querySelector('#add').addEventListener('click',() => openTransaction());
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click',() => button.closest('dialog').close()));
transactionForm.addEventListener('submit',event => {
  event.preventDefault();
  const fields = new FormData(transactionForm);
  const description = fields.get('description').trim();
  if (!description) {
    transactionFields.description.setCustomValidity('Enter a description.');
    transactionFields.description.reportValidity();
    return;
  }
  const item = {
    id:editingId ?? (globalThis.crypto?.randomUUID?.() ?? Date.now()+'-'+Math.random()),
    description,type:fields.get('type'),category:fields.get('category'),
    amount:Math.round(Number(fields.get('amount'))*100),date:fields.get('date')
  };
  const updated = editingId ? state.transactions.map(row => row.id === editingId ? item : row) : [item,...state.transactions];
  if (commit({...state,transactions:updated},editingId ? 'Transaction updated.' : 'Transaction added.')) {
    monthControl.value = item.date.slice(0,7);
    transactionDialog.close();
    render();
  }
});

content.addEventListener('click',event => {
  const edit = event.target.closest('[data-edit]');
  const remove = event.target.closest('[data-delete]');
  if (edit) openTransaction(state.transactions.find(row => row.id === edit.dataset.edit));
  if (remove) {
    deleteId = remove.dataset.delete;
    deleteDialog.showModal();
    deleteDialog.querySelector('[data-close].secondary').focus();
  }
});
document.querySelector('#delete-form').addEventListener('submit',event => {
  event.preventDefault();
  const remaining = state.transactions.filter(row => row.id !== deleteId);
  if (commit({...state,transactions:remaining},'Transaction deleted.')) {
    deleteDialog.close();
    render();
  }
});
monthControl.addEventListener('change',() => {
  if (!/^\d{4}-\d{2}$/.test(monthControl.value) || Number(monthControl.value.slice(0,4)) < 1000) {
    monthControl.value = isoDate(today).slice(0,7);
  }
  render();
});
window.addEventListener('hashchange',render);
render();
