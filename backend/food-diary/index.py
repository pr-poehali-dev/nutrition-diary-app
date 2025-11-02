'''
Business: API для работы с дневником питания через MySQL
Args: event - dict с httpMethod, body, queryStringParameters
      context - object с request_id, function_name
Returns: HTTP response dict с данными дневника
'''

import json
import os
from typing import Dict, Any, List, Optional
from datetime import datetime
import pymysql
from pymysql.cursors import DictCursor

def get_db_connection(config: Dict[str, str]):
    return pymysql.connect(
        host=config['host'],
        port=int(config.get('port', 3306)),
        user=config['user'],
        password=config['password'],
        database=config['database'],
        cursorclass=DictCursor,
        autocommit=True
    )

def init_database(connection):
    with connection.cursor() as cursor:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS food_entries (
                id VARCHAR(50) PRIMARY KEY,
                products JSON NOT NULL,
                entry_date DATETIME NOT NULL,
                has_allergy BOOLEAN NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-DB-Config',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    headers = event.get('headers', {})
    db_config_header = headers.get('X-DB-Config') or headers.get('x-db-config')
    
    if not db_config_header:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Missing database configuration'}),
            'isBase64Encoded': False
        }
    
    try:
        db_config = json.loads(db_config_header)
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Invalid database configuration format'}),
            'isBase64Encoded': False
        }
    
    try:
        connection = get_db_connection(db_config)
        init_database(connection)
        
        if method == 'GET':
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT id, products, entry_date, has_allergy, created_at
                    FROM food_entries
                    ORDER BY entry_date DESC
                """)
                entries = cursor.fetchall()
                
                for entry in entries:
                    if isinstance(entry['products'], str):
                        entry['products'] = json.loads(entry['products'])
                    entry['entry_date'] = entry['entry_date'].isoformat()
                    entry['created_at'] = entry['created_at'].isoformat()
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'entries': entries}),
                    'isBase64Encoded': False
                }
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            entry_id = body_data.get('id')
            products = body_data.get('products', [])
            entry_date = body_data.get('date')
            has_allergy = body_data.get('hasAllergy', False)
            
            with connection.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO food_entries (id, products, entry_date, has_allergy)
                    VALUES (%s, %s, %s, %s)
                """, (entry_id, json.dumps(products), entry_date, has_allergy))
            
            return {
                'statusCode': 201,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'success': True, 'id': entry_id}),
                'isBase64Encoded': False
            }
        
        elif method == 'DELETE':
            params = event.get('queryStringParameters', {})
            entry_id = params.get('id')
            
            if not entry_id:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Missing entry ID'}),
                    'isBase64Encoded': False
                }
            
            with connection.cursor() as cursor:
                cursor.execute("DELETE FROM food_entries WHERE id = %s", (entry_id,))
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'success': True}),
                'isBase64Encoded': False
            }
        
        elif method == 'PUT':
            body_data = json.loads(event.get('body', '{}'))
            entries = body_data.get('entries', [])
            
            with connection.cursor() as cursor:
                cursor.execute("DELETE FROM food_entries")
                
                for entry in entries:
                    cursor.execute("""
                        INSERT INTO food_entries (id, products, entry_date, has_allergy)
                        VALUES (%s, %s, %s, %s)
                    """, (
                        entry['id'],
                        json.dumps(entry['products']),
                        entry['date'],
                        entry['hasAllergy']
                    ))
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'success': True, 'synced': len(entries)}),
                'isBase64Encoded': False
            }
        
        return {
            'statusCode': 405,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    except pymysql.Error as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': f'Database error: {str(e)}'}),
            'isBase64Encoded': False
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': f'Server error: {str(e)}'}),
            'isBase64Encoded': False
        }
    
    finally:
        if 'connection' in locals():
            connection.close()
