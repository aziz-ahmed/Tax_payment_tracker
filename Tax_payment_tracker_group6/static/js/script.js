
    document.addEventListener('DOMContentLoaded', function() {
        const taxRateInput = document.getElementById('taxRate');
        taxRateInput.value = 0.06; // Default tax rate set to 6%
    
        setupDueDateDropdowns();
        setupEventListeners();
        fetchPayments();
        

    function setupDueDateDropdowns() {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const years = [currentYear, currentYear + 1];
        const dates = [ "01-15", "04-15", "06-15", "09-15"];
        const dueDateSelect = document.getElementById('due_date');
        const filterDueDateSelect = document.getElementById('filter_due_date');
        dates.forEach((date, index) => {
            const [month, day] = date.split('-').map(Number);
            const isAfterDate = currentDate > new Date(currentYear, month - 1, day);
            const year = isAfterDate ? years[1] : years[0];
            const option = new Option(`${date} ${year}`, `${year}-${date}`);
            dueDateSelect.add(option.cloneNode(true));
            filterDueDateSelect.add(option);
        });
    }
    
        function setupEventListeners() {
            document.getElementById('paymentForm').addEventListener('submit', submitForm);
            document.getElementById('filter_due_date').addEventListener('change', updatePaymentsSummary);
            taxRateInput.addEventListener('input', updatePaymentsSummary);
        }
    
        function fetchPayments() {
            fetch('/api/payments')
            .then(response => response.json())
            .then(data => populatePaymentsTable(data))
            .catch(error => console.error('Error fetching payments:', error));
        }
    
        function populatePaymentsTable(payments) {
            const tableBody = document.getElementById('paymentsTable').getElementsByTagName('tbody')[0];
            tableBody.innerHTML = ''; // Clear existing entries
            payments.forEach(payment => {
                let row = tableBody.insertRow();
                row.innerHTML = `
                                 <td>${payment.company}</td>
                                 <td>$${payment.amount.toFixed(2)}</td>
                                 <td>${payment.payment_date}</td>
                                 <td>${payment.status}</td>
                                 <td>${payment.due_date}</td>
                                 <td>
                                     <button onclick="editPayment(${payment.id})" class="btn btn-info">Edit</button>
                                     <button onclick="deletePayment(${payment.id})" class="btn btn-danger">Delete</button>
                                 </td>`;
            });
        }
            
        function submitForm(event) {
            event.preventDefault();
            const paymentId = document.getElementById('paymentId').value;
            const company = document.getElementById('company').value;
            const amount = parseFloat(document.getElementById('amount').value);
            const paymentDate = document.getElementById('payment_date').value;
            const status = document.getElementById('status').value;
            const dueDate = document.getElementById('due_date').value;

            const method = paymentId ? 'PUT' : 'POST';
            const url = paymentId ? `/api/payments/${paymentId}` : '/api/payments';

            fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ company, amount, payment_date: paymentDate, status, due_date: dueDate })
            })
            .then(response => response.json())
            .then(data => {
                const modal = bootstrap.Modal.getInstance(document.getElementById('paymentModal'));
                modal.hide();
                fetchPayments();
            })
            .catch(error => console.error('Error:', error));
        }
        window.editPayment = function(id) {
        fetch(`/api/payments/${id}`)
        .then(response => response.json())
        .then(data => {
            document.getElementById('paymentId').value = data.id;
            document.getElementById('company').value = data.company;
            document.getElementById('amount').value = data.amount;
            document.getElementById('payment_date').value = data.payment_date;
            document.getElementById('status').value = data.status;
            document.getElementById('due_date').value = data.due_date;
            const modal = new bootstrap.Modal(document.getElementById('paymentModal'));
            modal.show();
        })
        .catch(error => console.error('Error loading payment:', error));
    }
    
        
        window.deletePayment = function(id) {
        if (confirm("Are you sure you want to delete this payment?")) {
            fetch(`/api/payments/${id}`, { method: 'DELETE' })
            .then(response => {
                if (response.ok) {
                    fetchPayments();
                }
            })
            .catch(error => console.error('Error deleting payment:', error));
        }
    }
    
    function updatePaymentsSummary() {
    const selectedDueDate = document.getElementById('filter_due_date').value;
    const taxRate = parseFloat(taxRateInput.value);

    fetch(`/api/payments?due_date=${selectedDueDate}`)
    .then(response => response.json())
    .then(payments => {
        const tableBody = document.getElementById('filteredPaymentsTableBody');
        tableBody.innerHTML = ''; // Clear existing entries

        payments.forEach(payment => {
            let row = tableBody.insertRow();
            row.innerHTML = `<td>${payment.company}</td>
                             <td>$${payment.amount.toFixed(2)}</td>
                             <td>${payment.payment_date}</td>
                             <td>${payment.status}</td>
                             <td>${payment.due_date}</td>`;
        });

        const totalAmount = payments.reduce((sum, record) => sum + record.amount, 0);
        const taxDue = totalAmount * taxRate;

        document.getElementById('totalAmount').textContent = `$${totalAmount.toFixed(2)}`;
        document.getElementById('taxDue').textContent = `$${taxDue.toFixed(2)} (@${(taxRate * 100).toFixed(2)}%)`;
    })
    .catch(error => console.error('Error fetching payments:', error));
}
    });
