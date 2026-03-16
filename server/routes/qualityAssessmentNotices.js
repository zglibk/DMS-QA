const express = require('express');
const router = express.Router();
const { executeQuery } = require('../db');
const sql = require('mssql');

// Get all notices with pagination and search
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    const keyword = req.query.keyword || '';

    let whereClause = "WHERE 1=1";
    if (keyword) {
      whereClause += ` AND (AssessmentNo LIKE @keyword OR PersonName LIKE @keyword OR WorkOrder LIKE @keyword)`;
    }

    const query = `
      SELECT * FROM (
        SELECT *, ROW_NUMBER() OVER (ORDER BY CreatedAt DESC) AS RowNum
        FROM QualityAssessmentNotices
        ${whereClause}
      ) AS RowConstrainedResult
      WHERE RowNum > @offset AND RowNum <= (@offset + @pageSize)
      ORDER BY RowNum;

      SELECT COUNT(*) as total FROM QualityAssessmentNotices ${whereClause};
    `;

    const result = await executeQuery(async (pool) => {
      const request = pool.request();
      request.input('offset', sql.Int, offset);
      request.input('pageSize', sql.Int, pageSize);
      if (keyword) {
        request.input('keyword', sql.NVarChar, `%${keyword}%`);
      }
      return await request.query(query);
    });

    res.json({
      success: true,
      data: {
        list: result.recordsets[0],
        total: result.recordsets[1][0].total
      }
    });
  } catch (error) {
    console.error('Failed to get assessment notices:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Check existence
router.get('/check-existence', async (req, res) => {
  try {
    const { sourceType, sourceId } = req.query;
    if (!sourceType || !sourceId) {
       return res.status(400).json({ success: false, message: 'Missing parameters' });
    }

    const result = await executeQuery(async (pool) => {
      const request = pool.request();
      request.input('SourceType', sql.NVarChar, sourceType);
      request.input('SourceID', sql.Int, parseInt(sourceId));
      return await request.query('SELECT TOP 1 ID FROM QualityAssessmentNotices WHERE SourceType = @SourceType AND SourceID = @SourceID');
    });

    if (result.recordset.length > 0) {
      res.json({ success: true, data: { exists: true, id: result.recordset[0].ID } });
    } else {
      res.json({ success: true, data: { exists: false } });
    }
  } catch (error) {
    console.error('Failed to check existence:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get single notice
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await executeQuery(async (pool) => {
      const request = pool.request();
      request.input('id', sql.Int, parseInt(id));
      return await request.query('SELECT * FROM QualityAssessmentNotices WHERE ID = @id');
    });

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Notice not found' });
    }

    res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    console.error('Failed to get assessment notice:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create new notice
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    
    // Auto-generate AssessmentNo if empty
    let assessmentNo = data.AssessmentNo;
    if (!assessmentNo) {
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const numResult = await executeQuery(async (pool) => {
        return await pool.request().query(`SELECT COUNT(*) as count FROM QualityAssessmentNotices WHERE AssessmentNo LIKE 'QA-${dateStr}-%'`);
      });
      const count = numResult.recordset[0].count + 1;
      assessmentNo = `QA-${dateStr}-${String(count).padStart(3, '0')}`;
    }

    const query = `
      INSERT INTO QualityAssessmentNotices (
        SourceType, SourceID, AssessmentNo, PersonName, Post, Supervisor, Department, 
        WorkOrder, Submitter, OccurrenceDate, Location, SubmitDate, FaultDesc, 
        AnalysisDesc, AssessmentDetails, TotalAmount, AmountInWords, IssuingDept, 
        Issuer, IssueDate, Receiver, ReceiveDate, GMApproval, GMApprovalDate,
        QualityDeptOpinion, QualityDeptPerfAmount
      ) 
      OUTPUT INSERTED.ID
      VALUES (
        @SourceType, @SourceID, @AssessmentNo, @PersonName, @Post, @Supervisor, @Department, 
        @WorkOrder, @Submitter, @OccurrenceDate, @Location, @SubmitDate, @FaultDesc, 
        @AnalysisDesc, @AssessmentDetails, @TotalAmount, @AmountInWords, @IssuingDept, 
        @Issuer, @IssueDate, @Receiver, @ReceiveDate, @GMApproval, @GMApprovalDate,
        @QualityDeptOpinion, @QualityDeptPerfAmount
      )
    `;

    const result = await executeQuery(async (pool) => {
      const request = pool.request();
      request.input('SourceType', sql.NVarChar, data.SourceType || null);
      request.input('SourceID', sql.Int, data.SourceID ? parseInt(data.SourceID) : null);
      request.input('AssessmentNo', sql.NVarChar, assessmentNo);
      request.input('PersonName', sql.NVarChar, data.PersonName || null);
      request.input('Post', sql.NVarChar, data.Post || null);
      request.input('Supervisor', sql.NVarChar, data.Supervisor || null);
      request.input('Department', sql.NVarChar, data.Department || null);
      request.input('WorkOrder', sql.NVarChar, data.WorkOrder || null);
      request.input('Submitter', sql.NVarChar, data.Submitter || null);
      request.input('OccurrenceDate', sql.Date, data.OccurrenceDate || null);
      request.input('Location', sql.NVarChar, data.Location || null);
      request.input('SubmitDate', sql.Date, data.SubmitDate || null);
      request.input('FaultDesc', sql.NVarChar, data.FaultDesc || null);
      request.input('AnalysisDesc', sql.NVarChar, data.AnalysisDesc || null);
      request.input('AssessmentDetails', sql.NVarChar, data.AssessmentDetails ? JSON.stringify(data.AssessmentDetails) : null);
      request.input('TotalAmount', sql.Decimal(18,2), data.TotalAmount || 0);
      request.input('AmountInWords', sql.NVarChar, data.AmountInWords || null);
      request.input('IssuingDept', sql.NVarChar, data.IssuingDept || null);
      request.input('Issuer', sql.NVarChar, data.Issuer || null);
      request.input('IssueDate', sql.Date, data.IssueDate || null);
      request.input('Receiver', sql.NVarChar, data.Receiver || null);
      request.input('ReceiveDate', sql.Date, data.ReceiveDate || null);
      request.input('GMApproval', sql.NVarChar, data.GMApproval || null);
      request.input('GMApprovalDate', sql.Date, data.GMApprovalDate || null);
      request.input('QualityDeptOpinion', sql.NVarChar, data.QualityDeptOpinion ? JSON.stringify(data.QualityDeptOpinion) : null);
      request.input('QualityDeptPerfAmount', sql.Decimal(18,2), data.QualityDeptPerfAmount || null);
      
      return await request.query(query);
    });

    res.json({ success: true, message: 'Created successfully', id: result.recordset[0].ID });
  } catch (error) {
    console.error('Failed to create assessment notice:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update notice
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    
    const query = `
      UPDATE QualityAssessmentNotices SET
        PersonName = @PersonName,
        Post = @Post,
        Supervisor = @Supervisor,
        Department = @Department,
        WorkOrder = @WorkOrder,
        Submitter = @Submitter,
        OccurrenceDate = @OccurrenceDate,
        Location = @Location,
        SubmitDate = @SubmitDate,
        FaultDesc = @FaultDesc,
        AnalysisDesc = @AnalysisDesc,
        AssessmentDetails = @AssessmentDetails,
        TotalAmount = @TotalAmount,
        AmountInWords = @AmountInWords,
        IssuingDept = @IssuingDept,
        Issuer = @Issuer,
        IssueDate = @IssueDate,
        Receiver = @Receiver,
        ReceiveDate = @ReceiveDate,
        GMApproval = @GMApproval,
        GMApprovalDate = @GMApprovalDate,
        QualityDeptOpinion = @QualityDeptOpinion,
        QualityDeptPerfAmount = @QualityDeptPerfAmount,
        UpdatedAt = GETDATE()
      WHERE ID = @id
    `;

    await executeQuery(async (pool) => {
      const request = pool.request();
      request.input('id', sql.Int, parseInt(id));
      request.input('PersonName', sql.NVarChar, data.PersonName || null);
      request.input('Post', sql.NVarChar, data.Post || null);
      request.input('Supervisor', sql.NVarChar, data.Supervisor || null);
      request.input('Department', sql.NVarChar, data.Department || null);
      request.input('WorkOrder', sql.NVarChar, data.WorkOrder || null);
      request.input('Submitter', sql.NVarChar, data.Submitter || null);
      request.input('OccurrenceDate', sql.Date, data.OccurrenceDate || null);
      request.input('Location', sql.NVarChar, data.Location || null);
      request.input('SubmitDate', sql.Date, data.SubmitDate || null);
      request.input('FaultDesc', sql.NVarChar, data.FaultDesc || null);
      request.input('AnalysisDesc', sql.NVarChar, data.AnalysisDesc || null);
      request.input('AssessmentDetails', sql.NVarChar, data.AssessmentDetails ? JSON.stringify(data.AssessmentDetails) : null);
      request.input('TotalAmount', sql.Decimal(18,2), data.TotalAmount || 0);
      request.input('AmountInWords', sql.NVarChar, data.AmountInWords || null);
      request.input('IssuingDept', sql.NVarChar, data.IssuingDept || null);
      request.input('Issuer', sql.NVarChar, data.Issuer || null);
      request.input('IssueDate', sql.Date, data.IssueDate || null);
      request.input('Receiver', sql.NVarChar, data.Receiver || null);
      request.input('ReceiveDate', sql.Date, data.ReceiveDate || null);
      request.input('GMApproval', sql.NVarChar, data.GMApproval || null);
      request.input('GMApprovalDate', sql.Date, data.GMApprovalDate || null);
      
      return await request.query(query);
    });

    res.json({ success: true, message: 'Updated successfully' });
  } catch (error) {
    console.error('Failed to update assessment notice:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete notice
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await executeQuery(async (pool) => {
      const request = pool.request();
      request.input('id', sql.Int, parseInt(id));
      return await request.query('DELETE FROM QualityAssessmentNotices WHERE ID = @id');
    });

    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    console.error('Failed to delete assessment notice:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;