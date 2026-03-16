const sql = require('mssql');
require('dotenv').config({ path: '.env.development' });

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function createTable() {
  try {
    await sql.connect(config);
    console.log('Connected to DB');

    const result = await sql.query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='QualityAssessmentNotices' AND xtype='U')
      BEGIN
        CREATE TABLE QualityAssessmentNotices (
          ID int IDENTITY(1,1) PRIMARY KEY,
          SourceType nvarchar(50), -- Exception, Complaint, Rework
          SourceID int,
          AssessmentNo nvarchar(50),
          PersonName nvarchar(50),
          Post nvarchar(50),
          Supervisor nvarchar(50),
          Department nvarchar(50),
          WorkOrder nvarchar(50),
          Submitter nvarchar(50),
          OccurrenceDate date,
          Location nvarchar(100),
          SubmitDate date,
          FaultDesc nvarchar(max),
          AnalysisDesc nvarchar(max),
          AssessmentDetails nvarchar(max), -- JSON string for dynamic rows
          TotalAmount decimal(18,2),
          AmountInWords nvarchar(100),
          IssuingDept nvarchar(50),
          Issuer nvarchar(50),
          IssueDate date,
          Receiver nvarchar(50),
          ReceiveDate date,
          GMApproval nvarchar(50),
          GMApprovalDate date,
          CreatedAt datetime DEFAULT GETDATE(),
          UpdatedAt datetime DEFAULT GETDATE()
        )
        PRINT 'Table QualityAssessmentNotices created.'
      END
      ELSE
      BEGIN
        PRINT 'Table QualityAssessmentNotices already exists.'
      END
    `);
    console.log(result);
  } catch (err) {
    console.error(err);
  } finally {
    sql.close();
  }
}

createTable();
