from flask import Flask, request, render_template, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
import logging

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///tax_payments.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
CORS(app)

db = SQLAlchemy(app)

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class TaxPayment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    company = db.Column(db.String(100))
    amount = db.Column(db.Float)
    payment_date = db.Column(db.DateTime)
    status = db.Column(db.String(50))
    due_date = db.Column(db.DateTime) 

    def to_dict(self):
        return {
            "id": self.id,
            "company": self.company,
            "amount": self.amount,
            "payment_date": self.payment_date.strftime('%Y-%m-%d') if self.payment_date else None,
            "status": self.status,
            "due_date": self.due_date.strftime('%Y-%m-%d') if self.due_date else None
        }

with app.app_context():
    db.create_all()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/payments/<int:payment_id>', methods=['GET'])
def get_payment(payment_id):
    payment = TaxPayment.query.get(payment_id)
    if payment:
        logger.debug(f"Retrieved payment with ID: {payment_id}")
        return jsonify(payment.to_dict())
    else:
        logger.debug(f"Payment not found with ID: {payment_id}")
        return jsonify({"error": "Payment not found"}), 404

@app.route('/api/payments', methods=['GET', 'POST'])
def api_payments():
    if request.method == 'GET':
        due_date = request.args.get('due_date')
        if due_date:
            due_date = datetime.strptime(due_date, '%Y-%m-%d') 
            payments = TaxPayment.query.filter_by(due_date=due_date).all()
        else:
            payments = TaxPayment.query.all()
        logger.debug(f"Retrieved {len(payments)} payments")
        return jsonify([payment.to_dict() for payment in payments])

    if request.method == 'POST':
        data = request.get_json()
        new_payment = TaxPayment( 
            company=data['company'],
            amount=data['amount'],
            payment_date=datetime.strptime(data['payment_date'], '%Y-%m-%d'),
            status=data['status'],
            due_date=datetime.strptime(data['due_date'], '%Y-%m-%d')
        )
        db.session.add(new_payment)
        db.session.commit()
        logger.debug(f"Created new payment with ID: {new_payment.id}")
        return jsonify({"success": True, "id": new_payment.id}), 201

@app.route('/api/payments/<int:payment_id>', methods=['PUT'])
def update_payment(payment_id):
    data = request.get_json()
    payment = TaxPayment.query.get(payment_id) 
    if not payment:
        logger.debug(f"Payment not found with ID: {payment_id}")
        return jsonify({"error": "Payment not found"}), 404
    payment.company = data['company']
    payment.amount = data['amount']
    payment.payment_date = datetime.strptime(data['payment_date'], '%Y-%m-%d')
    payment.status = data['status']
    payment.due_date = datetime.strptime(data['due_date'], '%Y-%m-%d')
    db.session.commit()
    logger.debug(f"Updated payment with ID: {payment_id}")
    return jsonify({"success": True}), 200
    

@app.route('/api/payments/<int:payment_id>', methods=['DELETE'])
def delete_payment(payment_id):
    payment = TaxPayment.query.get(payment_id)
    if payment:
        db.session.delete(payment)
        db.session.commit()
        logger.debug(f"Deleted payment with ID: {payment_id}")
        return jsonify({"success": True}), 200
    else:
        logger.debug(f"Payment not found with ID: {payment_id}")
        return jsonify({"error": "Payment not found"}), 404
        
@app.errorhandler(Exception)
def handle_exception(e):
    logger.exception(str(e))
    return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)