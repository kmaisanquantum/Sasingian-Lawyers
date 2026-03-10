import sys

with open('backend/routes/matters.js', 'r') as f:
    content = f.read()

# Update POST /api/matters
post_search = """        `INSERT INTO matters (case_number, client_id, matter_name, matter_type, statute_of_limitations, budget_amount,
           assigned_partner_id, assigned_associate_id, estimated_value, description)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,"""

post_replace = """        `INSERT INTO matters (case_number, client_id, matter_name, matter_type, statute_of_limitations, budget_amount,
           assigned_partner_id, assigned_associate_id, estimated_value, description, metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,"""

post_vals_search = """        [caseNumber, clientId, matterName, matterType, statuteOfLimitations || null, budgetAmount || null,
         assignedPartnerId || null, assignedAssociateId || null,
         estimatedValue || null, description || null]"""

post_vals_replace = """        [caseNumber, clientId, matterName, matterType, statuteOfLimitations || null, budgetAmount || null,
         assignedPartnerId || null, assignedAssociateId || null,
         estimatedValue || null, description || null, JSON.stringify(req.body.metadata || {})]"""

# Update PUT /api/matters/:id
put_search = """    const allowed = ['matter_name','matter_type','status','assigned_partner_id',
                     'assigned_associate_id','estimated_value','description','closing_date'];"""

put_replace = """    const allowed = ['matter_name','matter_type','status','assigned_partner_id',
                     'assigned_associate_id','estimated_value','description','closing_date', 'metadata'];"""

new_content = content.replace(post_search, post_replace)
new_content = new_content.replace(post_vals_search, post_vals_replace)
new_content = new_content.replace(put_search, put_replace)

if content == new_content:
    print('Failed to modify backend/routes/matters.js')
    sys.exit(1)

with open('backend/routes/matters.js', 'w') as f:
    f.write(new_content)
print('Successfully modified backend/routes/matters.js')
