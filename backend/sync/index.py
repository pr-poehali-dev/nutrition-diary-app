'''
Business: Синхронизация записей дневника питания между устройствами через PostgreSQL
Args: event - dict с httpMethod, body, queryStringParameters
      context - object с request_id, function_name
Returns: HTTP response dict с данными синхронизации
'''

import json
import os
from typing import Dict, Any, List
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        raise Exception('DATABASE_URL not configured')
    return psycopg2.connect(database_url, cursor_factory=RealDictCursor)

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    
    try:
        if method == 'GET':
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, products, entry_date, has_allergy, created_at, updated_at
                    FROM food_entries
                    ORDER BY entry_date DESC
                """)
                entries = cur.fetchall()
                
                result = []
                for entry in entries:
                    result.append({
                        'id': entry['id'],
                        'products': entry['products'],
                        'date': entry['entry_date'].isoformat(),
                        'hasAllergy': entry['has_allergy'],
                        'createdAt': entry['created_at'].isoformat() if entry['created_at'] else None,
                        'updatedAt': entry['updated_at'].isoformat() if entry['updated_at'] else None
                    })
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'entries': result}),
                    'isBase64Encoded': False
                }
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            entry_id = body_data.get('id')
            products = body_data.get('products', [])
            entry_date = body_data.get('date')
            has_allergy = body_data.get('hasAllergy', False)
            
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO food_entries (id, products, entry_date, has_allergy)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        products = EXCLUDED.products,
                        entry_date = EXCLUDED.entry_date,
                        has_allergy = EXCLUDED.has_allergy,
                        updated_at = CURRENT_TIMESTAMP
                """, (entry_id, json.dumps(products), entry_date, has_allergy))
                conn.commit()
            
            return {
                'statusCode': 201,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'success': True, 'id': entry_id}),
                'isBase64Encoded': False
            }
        
        elif method == 'PUT':
            body_data = json.loads(event.get('body', '{}'))
            entries = body_data.get('entries', [])
            
            with conn.cursor() as cur:
                for entry in entries:
                    cur.execute("""
                        INSERT INTO food_entries (id, products, entry_date, has_allergy)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT (id) DO UPDATE SET
                            products = EXCLUDED.products,
                            entry_date = EXCLUDED.entry_date,
                            has_allergy = EXCLUDED.has_allergy,
                            updated_at = CURRENT_TIMESTAMP
                    """, (
                        entry['id'],
                        json.dumps(entry['products']),
                        entry['date'],
                        entry['hasAllergy']
                    ))
                conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'success': True, 'synced': len(entries)}),
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
            
            with conn.cursor() as cur:
                cur.execute("DELETE FROM food_entries WHERE id = %s", (entry_id,))
                conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'success': True}),
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
        conn.close()
