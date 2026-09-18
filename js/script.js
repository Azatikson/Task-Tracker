let draggedCard = null;
let draggedColumn = null;
const history = [];
let currentCardForLabel = null;
let currentColumnForColor = null;

const board = document.getElementById('board');
const addColumnBtn = document.getElementById('add-column-btn');
const labelModal = document.getElementById('label-modal');
const labelModalClose = document.getElementById('label-modal-close');
const columnColorModal = document.getElementById('column-color-modal');
const columnColorModalClose = document.getElementById('column-color-modal-close');
const doneColumnSelect = document.getElementById('done-column-select');

function updateAll() {
    updateCounters();
    updateProgress();
    updateColumnSelect();
}

function updateCounters() {
    document.querySelectorAll('.column').forEach(column => {
        const container = column.querySelector('.cards-container');
        const count = container ? container.children.length : 0;
        const counter = column.querySelector('.card-count');
        if (counter) counter.textContent = count;
    });
}

function updateProgress() {
    const totalCards = document.querySelectorAll('.card').length;
    const doneColumnId = doneColumnSelect.value;
    const doneCards = document.querySelectorAll(`.cards-container[data-column-id="${doneColumnId}"] .card`).length;
    const percent = totalCards === 0 ? 0 : Math.round((doneCards / totalCards) * 100);
    document.getElementById('progress-percent').textContent = percent + '%';
    document.getElementById('progress-fill').style.width = percent + '%';
}

function updateColumnSelect() {
    const previousValue = doneColumnSelect.value;
    doneColumnSelect.innerHTML = '';
    document.querySelectorAll('.column').forEach(column => {
        const id = column.getAttribute('data-column-id');
        const title = column.querySelector('h2').textContent;
        const option = document.createElement('option');
        option.value = id;
        option.textContent = title;
        doneColumnSelect.appendChild(option);
    });

    if (previousValue && doneColumnSelect.querySelector(`option[value="${previousValue}"]`)) {
        doneColumnSelect.value = previousValue;
    } else if (doneColumnSelect.querySelector('option[value="done"]')) {
        doneColumnSelect.value = 'done';
    } else if (doneColumnSelect.options.length > 0) {
        doneColumnSelect.value = doneColumnSelect.options[0].value;
    }
    updateProgress();
}

function addHistoryEntry(action) {
    const now = new Date();
    const time = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    history.unshift(`${time} — ${action}`);
    if (history.length > 20) history.pop();
    renderHistory();
}

function renderHistory() {
    const list = document.getElementById('history-list');
    if (!list) return;
    list.innerHTML = '';
    history.forEach(entry => {
        const li = document.createElement('li');
        li.textContent = entry;
        list.appendChild(li);
    });
}

function createCard(text) {
    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('draggable', 'true');

    const labelSpan = document.createElement('span');
    labelSpan.className = 'card-label label-none';
    card.appendChild(labelSpan);

    const span = document.createElement('span');
    span.className = 'card-text';
    span.textContent = text;
    card.appendChild(span);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '×';
    deleteBtn.setAttribute('aria-label', 'Удалить карточку');
    card.appendChild(deleteBtn);

    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        card.classList.add('fade-out');
        card.addEventListener('animationend', () => {
            card.remove();
            updateAll();
            addHistoryEntry('Задача удалена');
        }, { once: true });
    });

    card.addEventListener('dblclick', () => {
        startEditing(card);
    });

    card.addEventListener('dragstart', (e) => {
        e.stopPropagation();
        draggedCard = card;
        draggedColumn = null;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', '');
    });

    card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        draggedCard = null;
        document.querySelectorAll('.cards-container').forEach(c => c.classList.remove('drag-over'));
    });

    labelSpan.addEventListener('click', (e) => {
        e.stopPropagation();
        openLabelModal(card);
    });

    return card;
}

function startEditing(card) {
    if (card.querySelector('.card-input')) return;
    const span = card.querySelector('.card-text');
    if (!span) return;

    // Создаём textarea для многострочного ввода
    const textarea = document.createElement('textarea');
    textarea.className = 'card-input';
    textarea.value = span.textContent;

    // Авто-рост высоты при вводе
    function autoResize() {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    }

    textarea.addEventListener('input', autoResize);

    card.replaceChild(textarea, span);
    textarea.focus();
    textarea.select();
    autoResize(); // сразу подгоняем под текущий текст

    function save() {
        const newText = textarea.value.trim() || 'Новая задача';
        const newSpan = document.createElement('span');
        newSpan.className = 'card-text';
        newSpan.textContent = newText;
        card.replaceChild(newSpan, textarea);
        addHistoryEntry(`Задача изменена: "${newText}"`);
    }

    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            save();
        }
        if (e.key === 'Escape') {
            const oldSpan = document.createElement('span');
            oldSpan.className = 'card-text';
            oldSpan.textContent = span.textContent;
            card.replaceChild(oldSpan, textarea);
        }
    });
    textarea.addEventListener('blur', save);
}

function createColumn(title, columnId = null) {
    const column = document.createElement('div');
    column.className = 'column';
    column.setAttribute('data-column-id', columnId || 'col-' + Date.now());
    column.setAttribute('draggable', 'true');

    const header = document.createElement('div');
    header.className = 'column-header';

    const h2 = document.createElement('h2');
    h2.textContent = title;
    makeColumnTitleEditable(h2);
    header.appendChild(h2);

    const count = document.createElement('span');
    count.className = 'card-count';
    count.textContent = '0';
    header.appendChild(count);

    const addBtn = document.createElement('button');
    addBtn.className = 'add-card-btn';
    addBtn.textContent = '+ Добавить';
    addBtn.setAttribute('data-column-id', column.getAttribute('data-column-id'));
    addBtn.addEventListener('click', () => {
        const container = column.querySelector('.cards-container');
        const card = createCard('Новая задача');
        container.appendChild(card);
        startEditing(card);
        addHistoryEntry('Задача добавлена');
        updateAll();
    });
    header.appendChild(addBtn);

    const deleteColumnBtn = document.createElement('button');
    deleteColumnBtn.className = 'delete-column-btn';
    deleteColumnBtn.innerHTML = '&times;';
    deleteColumnBtn.setAttribute('aria-label', 'Удалить колонку');
    deleteColumnBtn.addEventListener('click', () => {
        column.remove();
        addHistoryEntry(`Колонка "${h2.textContent}" удалена`);
        updateAll();
    });
    header.appendChild(deleteColumnBtn);

    const colorBtn = document.createElement('button');
    colorBtn.className = 'column-color-btn';
    colorBtn.innerHTML = '🎨';
    colorBtn.setAttribute('aria-label', 'Выбрать цвет колонки');
    colorBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openColumnColorModal(column);
    });
    header.appendChild(colorBtn);

    column.appendChild(header);

    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'cards-container';
    cardsContainer.setAttribute('data-column-id', column.getAttribute('data-column-id'));
    column.appendChild(cardsContainer);

    column.addEventListener('dragstart', (e) => {
        e.stopPropagation();
        draggedColumn = column;
        draggedCard = null;
        column.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', '');
    });

    column.addEventListener('dragend', () => {
        column.classList.remove('dragging');
        draggedColumn = null;
        document.querySelectorAll('.board').forEach(b => b.classList.remove('drag-over'));
    });

    cardsContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (draggedCard) {
            cardsContainer.classList.add('drag-over');
        }
    });

    cardsContainer.addEventListener('dragleave', () => {
        cardsContainer.classList.remove('drag-over');
    });

    cardsContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        cardsContainer.classList.remove('drag-over');
        if (draggedCard) {
            const after = getDragAfterElement(cardsContainer, e.clientY);
            if (after == null) cardsContainer.appendChild(draggedCard);
            else cardsContainer.insertBefore(draggedCard, after);
            addHistoryEntry('Задача перемещена');
            updateAll();
        }
    });

    return column;
}

function makeColumnTitleEditable(h2) {
    h2.addEventListener('dblclick', () => {
        if (h2.querySelector('input')) return;

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'card-input';
        input.value = h2.textContent;
        h2.textContent = '';
        h2.appendChild(input);
        input.focus();
        input.select();

        function save() {
            const newTitle = input.value.trim() || 'Без названия';
            h2.textContent = newTitle;
            addHistoryEntry(`Колонка переименована в "${newTitle}"`);
            updateColumnSelect();
        }

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') {
                h2.textContent = input.defaultValue;
            }
        });
        input.addEventListener('blur', save);
    });
}

function getDragAfterElement(container, y) {
    const elements = [...container.querySelectorAll('.card:not(.dragging)')];
    return elements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function getDragAfterElementForColumns(container, x) {
    const columns = [...container.querySelectorAll('.column:not(.dragging)')];
    return columns.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = x - box.left - box.width / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function openLabelModal(card) {
    currentCardForLabel = card;
    labelModal.classList.add('visible');
}

labelModalClose.addEventListener('click', () => {
    labelModal.classList.remove('visible');
});

document.querySelectorAll('.label-option').forEach(option => {
    option.addEventListener('click', () => {
        if (!currentCardForLabel) return;
        const color = option.getAttribute('data-color');
        const labelSpan = currentCardForLabel.querySelector('.card-label');
        labelSpan.className = 'card-label';
        if (color === 'none') {
            labelSpan.classList.add('label-none');
        } else {
            labelSpan.classList.add(`label-${color}`);
        }
        labelModal.classList.remove('visible');
        addHistoryEntry('Метка изменена');
    });
});

function openColumnColorModal(column) {
    currentColumnForColor = column;
    columnColorModal.classList.add('visible');
}

columnColorModalClose.addEventListener('click', () => {
    columnColorModal.classList.remove('visible');
});

document.querySelectorAll('.color-option').forEach(option => {
    option.addEventListener('click', () => {
        if (!currentColumnForColor) return;
        const color = option.getAttribute('data-color');
        currentColumnForColor.classList.remove(
            'column-color-red',
            'column-color-blue',
            'column-color-green',
            'column-color-yellow',
            'column-color-purple',
            'column-color-orange',
            'column-color-pink',
            'column-color-none'
        );
        if (color !== 'none') {
            currentColumnForColor.classList.add(`column-color-${color}`);
        } else {
            currentColumnForColor.classList.add('column-color-none');
        }
        columnColorModal.classList.remove('visible');
        addHistoryEntry('Цвет колонки изменён');
    });
});

document.getElementById('search-input').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    document.querySelectorAll('.card').forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(query) ? '' : 'none';
    });
});

document.getElementById('clear-history').addEventListener('click', () => {
    history.length = 0;
    renderHistory();
});

const themeToggle = document.getElementById('theme-toggle');
const sliderIcon = document.querySelector('.slider-icon');

function applyTheme(isDark) {
    if (isDark) {
        document.body.classList.add('dark-theme');
        sliderIcon.textContent = '☀️';
        themeToggle.checked = true;
    } else {
        document.body.classList.remove('dark-theme');
        sliderIcon.textContent = '🌙';
        themeToggle.checked = false;
    }
}

const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') applyTheme(true);
else applyTheme(false);

themeToggle.addEventListener('change', () => {
    const isDark = themeToggle.checked;
    applyTheme(isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
});

board.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedColumn) {
        board.classList.add('drag-over');
    }
});

board.addEventListener('dragleave', () => {
    board.classList.remove('drag-over');
});

board.addEventListener('drop', (e) => {
    e.preventDefault();
    board.classList.remove('drag-over');
    if (draggedColumn) {
        const afterColumn = getDragAfterElementForColumns(board, e.clientX);
        if (afterColumn == null) board.appendChild(draggedColumn);
        else board.insertBefore(draggedColumn, afterColumn);
        addHistoryEntry('Колонка перемещена');
        updateAll();
    }
});

createColumn('Нужно сделать', 'todo');
createColumn('В работе', 'in-progress');
createColumn('Готово', 'done');

addColumnBtn.addEventListener('click', () => {
    const newColumn = createColumn('Новая колонка');
    board.appendChild(newColumn);
    addHistoryEntry('Колонка добавлена');
    updateAll();
});

document.getElementById('history-toggle').addEventListener('click', () => {
    document.getElementById('history-content').classList.toggle('hidden');
});

updateAll();