// Dashboard de Pagamentos
// Script principal para funcionalidades e visualizações

// Variáveis globais
let allData = [];
let filteredData = [];
let currentPage = 1;
const rowsPerPage = 10;
let currentYear = "2025";
let currentMonth = "01";
let editingItemId = null;

// Cores para gráficos
const chartColors = [
    'rgba(52, 152, 219, 0.8)',
    'rgba(231, 76, 60, 0.8)',
    'rgba(46, 204, 113, 0.8)',
    'rgba(155, 89, 182, 0.8)',
    'rgba(241, 196, 15, 0.8)',
    'rgba(52, 73, 94, 0.8)',
    'rgba(230, 126, 34, 0.8)',
    'rgba(26, 188, 156, 0.8)',
    'rgba(236, 240, 241, 0.8)',
    'rgba(149, 165, 166, 0.8)'
];

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar data atual para o formulário
    const today = new Date();
    document.getElementById('input-date').valueAsDate = today;
    
    // Definir ano e mês selecionados
    currentYear = document.getElementById('year-select').value;
    currentMonth = document.getElementById('month-select').value;
    
    // Carregar dados iniciais
    loadData();
    
    // Configurar event listeners
    setupEventListeners();
    
    // Atualizar data de última atualização
    updateLastUpdateDate();
});

// Carregar dados do CSV ou localStorage
function loadData() {
    // Verificar se existem dados no localStorage para o ano/mês atual
    const storageKey = `pagamentos_${currentYear}_${currentMonth}`;
    const storedData = localStorage.getItem(storageKey);
    
    if (storedData) {
        // Usar dados do localStorage
        allData = JSON.parse(storedData);
        initializeDashboard();
    } else if (currentYear === "2023" && currentMonth === "01") {
        // Carregar dados iniciais do CSV apenas para janeiro de 2023
        Papa.parse('data/pagamentos_janeiro.csv', {
            download: true,
            header: true,
            dynamicTyping: true,
            complete: function(results) {
                processLoadedData(results.data);
            },
            error: function(error) {
                console.error('Erro ao carregar dados:', error);
                showNotification('Erro ao carregar dados. Verifique o console para mais detalhes.', 'error');
            }
        });
    } else {
        // Para outros meses/anos, iniciar com array vazio
        allData = [];
        initializeDashboard();
    }
}

// Processar dados carregados
function processLoadedData(data) {
    // Processar dados
    allData = data.filter(item => item.CLIENTES).map((item, index) => {
        // Adicionar ID único para cada item
        const newItem = { ...item, id: `item_${index}` };
        
        // Converter valor para número se for string
        if (typeof newItem.VALOR_PAGO === 'string') {
            newItem.VALOR_PAGO = parseFloat(newItem.VALOR_PAGO.replace('R$', '').replace('.', '').replace(',', '.').trim());
        }
        
        return newItem;
    });
    
    // Salvar no localStorage
    const storageKey = `pagamentos_${currentYear}_${currentMonth}`;
    localStorage.setItem(storageKey, JSON.stringify(allData));
    
    initializeDashboard();
}

// Inicializar dashboard
function initializeDashboard() {
    filteredData = [...allData];
    updateDashboard();
    populateFilters();
}

// Configurar event listeners
function setupEventListeners() {
    // Seleção de período
    document.getElementById('year-select').addEventListener('change', changePeriod);
    document.getElementById('month-select').addEventListener('change', changePeriod);
    
    // Botão de adicionar dados
    document.getElementById('add-data-btn').addEventListener('click', openAddModal);
    
    // Botão de exportar dados
    document.getElementById('export-data-btn').addEventListener('click', exportData);
    
    // Filtros
    document.getElementById('filter-date').addEventListener('change', applyFilters);
    document.getElementById('filter-service').addEventListener('change', applyFilters);
    document.getElementById('filter-bank').addEventListener('change', applyFilters);
    document.getElementById('filter-client').addEventListener('change', applyFilters);
    document.getElementById('reset-filters').addEventListener('click', resetFilters);
    
    // Busca
    document.getElementById('search-button').addEventListener('click', applySearch);
    document.getElementById('search-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            applySearch();
        }
    });
    
    // Ordenação
    document.getElementById('sort-select').addEventListener('change', applySorting);
    
    // Paginação
    document.getElementById('prev-page').addEventListener('click', () => changePage(-1));
    document.getElementById('next-page').addEventListener('click', () => changePage(1));
    
    // Modal
    const modal = document.getElementById('data-modal');
    const closeBtn = document.getElementsByClassName('close')[0];
    const cancelBtn = document.getElementById('cancel-form');
    
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeModal();
        }
    });
    
    // Formulário
    document.getElementById('payment-form').addEventListener('submit', savePaymentData);
}

// Mudar período (ano/mês)
function changePeriod() {
    currentYear = document.getElementById('year-select').value;
    currentMonth = document.getElementById('month-select').value;
    
    // Recarregar dados para o novo período
    loadData();
}

// Abrir modal para adicionar dados
function openAddModal() {
    // Resetar formulário
    document.getElementById('payment-form').reset();
    document.getElementById('modal-title').textContent = 'Adicionar Novo Pagamento';
    document.getElementById('edit-id').value = '';
    editingItemId = null;
    
    // Definir data padrão como hoje
    const today = new Date();
    document.getElementById('input-date').valueAsDate = today;
    
    // Exibir modal
    document.getElementById('data-modal').style.display = 'block';
}

// Abrir modal para editar dados
function openEditModal(id) {
    const item = allData.find(item => item.id === id);
    if (!item) return;
    
    editingItemId = id;
    document.getElementById('edit-id').value = id;
    document.getElementById('modal-title').textContent = 'Editar Pagamento';
    
    // Preencher formulário com dados existentes
    document.getElementById('input-client').value = item.CLIENTES;
    
    // Converter data do formato DD/MM/YYYY para YYYY-MM-DD para o input date
    if (item.DATA && item.DATA.includes('/')) {
        const parts = item.DATA.split('/');
        const dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
        document.getElementById('input-date').value = dateStr;
    } else {
        document.getElementById('input-date').value = item.DATA || '';
    }
    
    document.getElementById('input-value').value = item.VALOR_PAGO;
    document.getElementById('input-service').value = item.SERVICOS;
    document.getElementById('input-bank').value = item.BANCO;
    
    // Exibir modal
    document.getElementById('data-modal').style.display = 'block';
}

// Fechar modal
function closeModal() {
    document.getElementById('data-modal').style.display = 'none';
}

// Salvar dados do formulário
function savePaymentData(e) {
    e.preventDefault();
    
    // Obter valores do formulário
    const client = document.getElementById('input-client').value;
    const dateInput = document.getElementById('input-date').value;
    const value = parseFloat(document.getElementById('input-value').value);
    const service = document.getElementById('input-service').value;
    const bank = document.getElementById('input-bank').value;
    
    // Converter data do formato YYYY-MM-DD para DD/MM/YYYY
    const dateParts = dateInput.split('-');
    const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
    
    // Criar objeto de dados
    const paymentData = {
        CLIENTES: client,
        DATA: formattedDate,
        VALOR_PAGO: value,
        SERVICOS: service,
        BANCO: bank
    };
    
    if (editingItemId) {
        // Editar item existente
        const index = allData.findIndex(item => item.id === editingItemId);
        if (index !== -1) {
            paymentData.id = editingItemId;
            allData[index] = paymentData;
        }
    } else {
        // Adicionar novo item
        paymentData.id = `item_${Date.now()}`;
        allData.push(paymentData);
    }
    
    // Salvar no localStorage
    const storageKey = `pagamentos_${currentYear}_${currentMonth}`;
    localStorage.setItem(storageKey, JSON.stringify(allData));
    
    // Atualizar dashboard
    filteredData = [...allData];
    updateDashboard();
    populateFilters();
    
    // Fechar modal
    closeModal();
    
    // Mostrar notificação
    const message = editingItemId ? 'Pagamento atualizado com sucesso!' : 'Novo pagamento adicionado com sucesso!';
    showNotification(message, 'success');
    
    // Atualizar data de última atualização
    updateLastUpdateDate();
}

// Excluir pagamento
function deletePayment(id) {
    if (confirm('Tem certeza que deseja excluir este pagamento?')) {
        // Remover item do array
        const index = allData.findIndex(item => item.id === id);
        if (index !== -1) {
            allData.splice(index, 1);
            
            // Salvar no localStorage
            const storageKey = `pagamentos_${currentYear}_${currentMonth}`;
            localStorage.setItem(storageKey, JSON.stringify(allData));
            
            // Atualizar dashboard
            filteredData = [...allData];
            updateDashboard();
            populateFilters();
            
            // Mostrar notificação
            showNotification('Pagamento excluído com sucesso!', 'success');
            
            // Atualizar data de última atualização
            updateLastUpdateDate();
        }
    }
}

// Exportar dados
function exportData() {
    // Criar CSV a partir dos dados
    const headers = ['CLIENTES', 'DATA', 'VALOR_PAGO', 'SERVICOS', 'BANCO'];
    
    let csvContent = headers.join(',') + '\n';
    
    allData.forEach(item => {
        const row = [
            item.CLIENTES,
            item.DATA,
            item.VALOR_PAGO,
            item.SERVICOS,
            item.BANCO
        ];
        
        // Escapar campos com vírgulas
        const escapedRow = row.map(field => {
            if (field && field.toString().includes(',')) {
                return `"${field}"`;
            }
            return field;
        });
        
        csvContent += escapedRow.join(',') + '\n';
    });
    
    // Criar blob e link para download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `pagamentos_${currentYear}_${currentMonth}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('Dados exportados com sucesso!', 'success');
}

// Preencher filtros com opções únicas dos dados
function populateFilters() {
    // Limpar opções existentes, mantendo a primeira (Todos)
    const dateFilter = document.getElementById('filter-date');
    const serviceFilter = document.getElementById('filter-service');
    const bankFilter = document.getElementById('filter-bank');
    const clientFilter = document.getElementById('filter-client');
    
    // Manter apenas a primeira opção em cada filtro
    while (dateFilter.options.length > 1) dateFilter.remove(1);
    while (serviceFilter.options.length > 1) serviceFilter.remove(1);
    while (bankFilter.options.length > 1) bankFilter.remove(1);
    while (clientFilter.options.length > 1) clientFilter.remove(1);
    
    if (allData.length === 0) return;
    
    // Datas únicas
    const dates = [...new Set(allData.map(item => item.DATA))];
    dates.sort((a, b) => {
        // Ordenar datas no formato DD/MM/YYYY
        const partsA = a.split('/').map(Number);
        const partsB = b.split('/').map(Number);
        
        // Comparar ano, mês e dia
        if (partsA[2] !== partsB[2]) return partsA[2] - partsB[2];
        if (partsA[1] !== partsB[1]) return partsA[1] - partsB[1];
        return partsA[0] - partsB[0];
    });
    
    dates.forEach(date => {
        const option = document.createElement('option');
        option.value = date;
        option.textContent = date;
        dateFilter.appendChild(option);
    });
    
    // Serviços únicos
    const services = [...new Set(allData.map(item => item.SERVICOS))];
    services.sort();
    
    services.forEach(service => {
        const option = document.createElement('option');
        option.value = service;
        option.textContent = service;
        serviceFilter.appendChild(option);
    });
    
    // Bancos únicos
    const banks = [...new Set(allData.map(item => item.BANCO))];
    banks.sort();
    
    banks.forEach(bank => {
        const option = document.createElement('option');
        option.value = bank;
        option.textContent = bank;
        bankFilter.appendChild(option);
    });
    
    // Clientes únicos
    const clients = [...new Set(allData.map(item => item.CLIENTES))];
    clients.sort();
    
    clients.forEach(client => {
        const option = document.createElement('option');
        option.value = client;
        option.textContent = client;
        clientFilter.appendChild(option);
    });
}

// Aplicar filtros
function applyFilters() {
    const dateFilter = document.getElementById('filter-date').value;
    const serviceFilter = document.getElementById('filter-service').value;
    const bankFilter = document.getElementById('filter-bank').value;
    const clientFilter = document.getElementById('filter-client').value;
    
    filteredData = allData.filter(item => {
        return (dateFilter === 'all' || item.DATA === dateFilter) &&
               (serviceFilter === 'all' || item.SERVICOS === serviceFilter) &&
               (bankFilter === 'all' || item.BANCO === bankFilter) &&
               (clientFilter === 'all' || item.CLIENTES === clientFilter);
    });
    
    currentPage = 1;
    updateDashboard();
}

// Aplicar busca
function applySearch() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    
    if (searchTerm.trim() === '') {
        applyFilters(); // Se a busca estiver vazia, apenas aplica os filtros
        return;
    }
    
    // Filtra os dados já filtrados pelos filtros de dropdown
    filteredData = allData.filter(item => {
        return Object.values(item).some(value => 
            value && typeof value === 'string' && value.toLowerCase().includes(searchTerm)
        );
    });
    
    currentPage = 1;
    updateDashboard();
}

// Aplicar ordenação
function applySorting() {
    const sortOption = document.getElementById('sort-select').value;
    
    switch(sortOption) {
        case 'date-asc':
            filteredData.sort((a, b) => {
                return compareDates(a.DATA, b.DATA);
            });
            break;
        case 'date-desc':
            filteredData.sort((a, b) => {
                return compareDates(b.DATA, a.DATA);
            });
            break;
        case 'value-asc':
            filteredData.sort((a, b) => a.VALOR_PAGO - b.VALOR_PAGO);
            break;
        case 'value-desc':
            filteredData.sort((a, b) => b.VALOR_PAGO - a.VALOR_PAGO);
            break;
        case 'client-asc':
            filteredData.sort((a, b) => a.CLIENTES.localeCompare(b.CLIENTES));
            break;
        case 'client-desc':
            filteredData.sort((a, b) => b.CLIENTES.localeCompare(a.CLIENTES));
            break;
    }
    
    updateTable();
}

// Comparar datas no formato DD/MM/YYYY
function compareDates(dateA, dateB) {
    const partsA = dateA.split('/').map(Number);
    const partsB = dateB.split('/').map(Number);
    
    // Criar objetos Date (mês - 1 porque em JS os meses vão de 0-11)
    const dateObjA = new Date(partsA[2], partsA[1] - 1, partsA[0]);
    const dateObjB = new Date(partsB[2], partsB[1] - 1, partsB[0]);
    
    return dateObjA - dateObjB;
}

// Resetar filtros
function resetFilters() {
    document.getElementById('filter-date').value = 'all';
    document.getElementById('filter-service').value = 'all';
    document.getElementById('filter-bank').value = 'all';
    document.getElementById('filter-client').value = 'all';
    document.getElementById('search-input').value = '';
    
    filteredData = [...allData];
    currentPage = 1;
    updateDashboard();
}

// Mudar página
function changePage(direction) {
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    
    currentPage += direction;
    
    if (currentPage < 1) {
        currentPage = 1;
    } else if (currentPage > totalPages) {
        currentPage = totalPages;
    }
    
    updateTable();
    updatePagination();
}

// Atualizar todo o dashboard
function updateDashboard() {
    updateSummaryCards();
    updateCharts();
    updateTable();
    updatePagination();
}

// Atualizar cards de resumo
function updateSummaryCards() {
    // Valor total
    const totalValue = filteredData.reduce((sum, item) => sum + item.VALOR_PAGO, 0);
    document.getElementById('total-value').textContent = formatCurrency(totalValue);
    
    // Total de transações
    document.getElementById('total-transactions').textContent = filteredData.length;
    
    // Total de clientes únicos
    const uniqueClients = new Set(filteredData.map(item => item.CLIENTES));
    document.getElementById('total-clients').textContent = uniqueClients.size;
    
    // Média diária
    const uniqueDates = new Set(filteredData.map(item => item.DATA));
    const dailyAverage = uniqueDates.size > 0 ? totalValue / uniqueDates.size : 0;
    document.getElementById('daily-average').textContent = formatCurrency(dailyAverage);
}

// Atualizar gráficos
function updateCharts() {
    updateDailyPaymentsChart();
    updateServicesChart();
    updateBanksChart();
    updateClientsChart();
}

// Gráfico de pagamentos diários
function updateDailyPaymentsChart() {
    const ctx = document.getElementById('daily-payments-chart').getContext('2d');
    
    // Agrupar por data
    const dailyData = {};
    filteredData.forEach(item => {
        if (!dailyData[item.DATA]) {
            dailyData[item.DATA] = 0;
        }
        dailyData[item.DATA] += item.VALOR_PAGO;
    });
    
    // Ordenar datas
    const sortedDates = Object.keys(dailyData).sort((a, b) => {
        return compareDates(a, b);
    });
    
    const chartData = {
        labels: sortedDates,
        datasets: [{
            label: 'Valor Total (R$)',
            data: sortedDates.map(date => dailyData[date]),
            backgroundColor: 'rgba(52, 152, 219, 0.5)',
            borderColor: 'rgba(52, 152, 219, 1)',
            borderWidth: 1
        }]
    };
    
    if (window.dailyChart) {
        window.dailyChart.destroy();
    }
    
    window.dailyChart = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'R$ ' + value.toLocaleString('pt-BR');
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'R$ ' + context.parsed.y.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                        }
                    }
                }
            }
        }
    });
}

// Gráfico de distribuição por serviço
function updateServicesChart() {
    const ctx = document.getElementById('services-chart').getContext('2d');
    
    // Agrupar por serviço
    const serviceData = {};
    filteredData.forEach(item => {
        if (!serviceData[item.SERVICOS]) {
            serviceData[item.SERVICOS] = 0;
        }
        serviceData[item.SERVICOS] += item.VALOR_PAGO;
    });
    
    const services = Object.keys(serviceData);
    
    const chartData = {
        labels: services,
        datasets: [{
            data: services.map(service => serviceData[service]),
            backgroundColor: chartColors.slice(0, services.length),
            borderWidth: 1
        }]
    };
    
    if (window.servicesChart) {
        window.servicesChart.destroy();
    }
    
    window.servicesChart = new Chart(ctx, {
        type: 'pie',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        boxWidth: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${context.label}: R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Gráfico de distribuição por banco
function updateBanksChart() {
    const ctx = document.getElementById('banks-chart').getContext('2d');
    
    // Agrupar por banco
    const bankData = {};
    filteredData.forEach(item => {
        if (!bankData[item.BANCO]) {
            bankData[item.BANCO] = 0;
        }
        bankData[item.BANCO] += item.VALOR_PAGO;
    });
    
    const banks = Object.keys(bankData);
    
    const chartData = {
        labels: banks,
        datasets: [{
            data: banks.map(bank => bankData[bank]),
            backgroundColor: chartColors.slice(0, banks.length),
            borderWidth: 1
        }]
    };
    
    if (window.banksChart) {
        window.banksChart.destroy();
    }
    
    window.banksChart = new Chart(ctx, {
        type: 'doughnut',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        boxWidth: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${context.label}: R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Gráfico de top clientes
function updateClientsChart() {
    const ctx = document.getElementById('clients-chart').getContext('2d');
    
    // Agrupar por cliente
    const clientData = {};
    filteredData.forEach(item => {
        if (!clientData[item.CLIENTES]) {
            clientData[item.CLIENTES] = 0;
        }
        clientData[item.CLIENTES] += item.VALOR_PAGO;
    });
    
    // Ordenar clientes por valor e pegar os top 5
    const topClients = Object.entries(clientData)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    const chartData = {
        labels: topClients.map(client => client[0]),
        datasets: [{
            label: 'Valor Total (R$)',
            data: topClients.map(client => client[1]),
            backgroundColor: chartColors.slice(0, 5),
            borderColor: chartColors.slice(0, 5).map(color => color.replace('0.8', '1')),
            borderWidth: 1
        }]
    };
    
    if (window.clientsChart) {
        window.clientsChart.destroy();
    }
    
    window.clientsChart = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'R$ ' + value.toLocaleString('pt-BR');
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'R$ ' + context.parsed.x.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                        }
                    }
                }
            }
        }
    });
}

// Atualizar tabela
function updateTable() {
    const tableBody = document.getElementById('table-body');
    tableBody.innerHTML = '';
    
    if (filteredData.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="6" style="text-align: center;">Nenhum registro encontrado</td>`;
        tableBody.appendChild(row);
        return;
    }
    
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, filteredData.length);
    
    for (let i = startIndex; i < endIndex; i++) {
        const item = filteredData[i];
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${item.CLIENTES}</td>
            <td>${item.DATA}</td>
            <td>${formatCurrency(item.VALOR_PAGO)}</td>
            <td>${item.SERVICOS}</td>
            <td>${item.BANCO}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-edit" onclick="openEditModal('${item.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete" onclick="deletePayment('${item.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    }
}

// Atualizar paginação
function updatePagination() {
    const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
    document.getElementById('page-info').textContent = `Página ${currentPage} de ${totalPages}`;
    
    document.getElementById('prev-page').disabled = currentPage <= 1;
    document.getElementById('next-page').disabled = currentPage >= totalPages;
}

// Atualizar data de última atualização
function updateLastUpdateDate() {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR');
    document.getElementById('last-update').textContent = formattedDate;
}

// Mostrar notificação
function showNotification(message, type = 'info') {
    // Verificar se já existe uma notificação
    let notification = document.querySelector('.notification');
    
    if (!notification) {
        // Criar elemento de notificação
        notification = document.createElement('div');
        notification.className = 'notification';
        document.body.appendChild(notification);
        
        // Adicionar estilos inline para a notificação
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.right = '20px';
        notification.style.padding = '15px 20px';
        notification.style.borderRadius = '5px';
        notification.style.color = 'white';
        notification.style.fontWeight = '500';
        notification.style.zIndex = '9999';
        notification.style.boxShadow = '0 3px 10px rgba(0,0,0,0.2)';
        notification.style.transition = 'all 0.3s ease';
    }
    
    // Definir cor com base no tipo
    switch (type) {
        case 'success':
            notification.style.backgroundColor = 'var(--success-color)';
            break;
        case 'error':
            notification.style.backgroundColor = 'var(--accent-color)';
            break;
        default:
            notification.style.backgroundColor = 'var(--secondary-color)';
    }
    
    // Definir mensagem
    notification.textContent = message;
    
    // Exibir notificação
    notification.style.opacity = '1';
    
    // Remover após 3 segundos
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Funções auxiliares
function formatCurrency(value) {
    return 'R$ ' + value.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

// Expor funções para uso global (para os botões da tabela)
window.openEditModal = openEditModal;
window.deletePayment = deletePayment;
