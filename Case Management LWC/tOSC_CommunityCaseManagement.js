/**
 * @description       : 
 * @author            : Charush Devgan
 * @group             : 
 * @last modified on  : 23.02.2022
 * @last modified by  : Charush Devgan
 * Modifications Log
 * Ver   Date         Author           Modification
 * 1.0   23.02.2022   Charush Devgan   Initial Version
**/
import { LightningElement, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import validateClassId from '@salesforce/apex/TOSC_CommunityCaseController.validateClassId';
import getSubCategories from '@salesforce/apex/TOSC_CommunityCaseController.getSubCategories';
import getAccountId from '@salesforce/apex/TOSC_CommunityCaseController.getAccountId';
import insertContentDocumentLink from '@salesforce/apex/TOSC_CommunityCaseController.insertContentDocumentLink';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { createRecord } from 'lightning/uiRecordApi';
import CASE from '@salesforce/schema/Case';
import CASE_DESCRIPTION from '@salesforce/schema/Case.Description';
import CASE_SUBJECT from '@salesforce/schema/Case.Subject';
import CASE_CATEGORY from '@salesforce/schema/Case.TOSC_Category__c';
import CASE_SUB_CATEGORY from '@salesforce/schema/Case.TOSC_Subcategory__c';
import CASE_ACCOUNT from '@salesforce/schema/Case.AccountId';
//commented due to no record types in new env
//import CASE_RECORD_TYPE from '@salesforce/schema/Case.RecordTypeId';
import CASE_CLASS_ID from '@salesforce/schema/Case.TOSC_ClassId__c';
import CASE_ORIGIN from '@salesforce/schema/Case.Origin';
import CASE_TEACHER_CENTER from '@salesforce/schema/Case.TOSC_Center__c';
import COMMUNITY_CASE_RECORD_TYPE_ID from '@salesforce/label/c.TOSC_CommunityCaseRecordTypeId';
import ACCEPTED_FILE_FORMATS from '@salesforce/label/c.TOSC_AcceptedFileFormats';

export default class TOSC_CommunityCaseManagement extends NavigationMixin(LightningElement) {
    categories = [
        {label: "Classroom Technical Problems (Class and WrCs)", value: "Classroom Technical Problems (Class and WrCs)"},
        {label: "Class Status Case", value: "Class Status Case"},
        {label: "Academic Questions", value: "Academic Questions"},
        {label: "Payment Questions", value: "Payment Questions"},
        {label: "AXIS & Administrative Scheduling Issues", value: "AXIS & Administrative Scheduling Issues"},
        {label: "Student Issues", value: "Student Issues"}
    ];
    
    subCategories = [];
    classIdRequired = false;
    currentSection = "Category";

    categorySection = { visible: true ,
                         icon: "action:question_post_action" ,
                         disabled: false
                        };

    subCategorySection = { visible: false ,
                           icon: "action:question_post_action" ,
                           disabled: false
                         };
    
    classIdSection = { visible: false ,
                       icon: "action:question_post_action" ,
                       disabled: false
                    };
    
    descriptionSection = { visible: false ,
                           icon: "action:question_post_action" ,
                           disabled: false
                        };

    isLoading = false;
    classId;
    category;
    subCategory;
    description;
    @track
    documents = [];

    get acceptedFormats() {
        
        let fileFormats = String(ACCEPTED_FILE_FORMATS);
        fileFormats = '.'+ fileFormats.replaceAll(';', ';.');
        
        return fileFormats.split(';');
    }

    handleFileUpload(event) {
        
        if(this.documents.length<5) {
            const file = event.target.files[0];
        
            if(file.size < 5242880) {
                var reader = new FileReader()
                reader.onload = () => {
                    var fileData = reader.result.split(',')[1]
                    this.documents.push ( {
                        'Title': file.name,
                        'PathOnClient': file.name,
                        'VersionData': fileData
                    });
                }
                reader.readAsDataURL(file)

            } else {
                this.createToastMessages('Info', 'The document(s) size should be less than 5 Mb.', 'info');    
            }
            
        } else {
            this.createToastMessages('Info', 'Cannot upload more than 5 documents.', 'info');
        }
    }

    async saveDocuments(relatedEntityId) {
        
        let ids = [];
        for(let i=0;i<this.documents.length;i++) {
            const contentVer = {apiName: 'ContentVersion', fields: this.documents[i]}
    
            const uploadedDocument = await createRecord(contentVer);
            ids.push(uploadedDocument.id);  
        }
        
        if(ids.length!=0){
            const areConDocLinksCreated = await insertContentDocumentLink({"contentVersionIds": ids, "caseId": relatedEntityId});
            return areConDocLinksCreated;
        }
    }

    @wire(getAccountId)
    accountDetails;

    openCategorySection() {
        if(this.currentSection!="Category") {
            this.categorySection.visible = true;
            this.subCategorySection.visible = false;
            this.classIdSection.visible = false;
            this.descriptionSection.visible = false;
            this.currentSection = "Category";
        }
    }
    
    openSubCategorySection() {
        if(this.currentSection!="SubCategory" && this.categorySection.disabled) {
            this.categorySection.visible = false;
            this.subCategorySection.visible = true;
            this.classIdSection.visible = false;
            this.descriptionSection.visible = false;
            this.currentSection = "SubCategory";
        }
    }
    
    openClassIdSection() {
            
        if(this.currentSection!="ClassId" && this.subCategorySection.disabled) {
            this.categorySection.visible = false;
            this.subCategorySection.visible = false;
            this.classIdSection.visible = true;
            this.descriptionSection.visible = false;
            this.currentSection = "ClassId";
        }
    }
    
    openDescriptionSection() {
        if(this.currentSection!="Description") {
            if(this.classIdSection.disabled) {
                this.categorySection.visible = false;
                this.subCategorySection.visible = false;
                this.classIdSection.visible = false;
                this.descriptionSection.visible = true;
                this.currentSection = "Description";
            }
        }
    }

    handleCategoryChange(event) {
        this.category = event.detail.value;
        this.template.querySelector('lightning-combobox[data-id=Category]').blur();

        this.subCategories = [];
        getSubCategories({category:this.category})
            .then((result) => {  
                if(result!=null && result!='') {
                    for(let i=0;i<result.length;i++) { 
                        
                        let temp = result[i]['TOSC_SubCategories__c'].split(';');
                        
                        for(let j=0;j<temp.length;j++) {
                            this.subCategories.push({
                                        "label": temp[j],
                                        "value": temp[j],
                                        "ClassIdRequired": result[i]['TOSC_ClassIdRequired__c']
                                });
                        }    
                    }
                }
            })
            .catch((error) => {
                this.createToastMessages('Error','Error while connecting to Salesforce.','error');
            });
    }

    handleSubCategoryChange(event) {
        this.subCategory = event.detail.value;
        this.template.querySelector('lightning-combobox[data-id=SubCategory]').blur();
        let temp = this.subCategories.filter(subCat => subCat['value'] == this.subCategory);
        this.classIdRequired = temp[0].ClassIdRequired;
    }

    createToastMessages(heading, msg, type) {
        const evt = new ShowToastEvent({
            title: heading,
            message: msg,
            variant: type,
        });
        this.dispatchEvent(evt);
    }

    handleClassIdChange(event) {
        this.classId = event.detail.value;
    }

    handleChangeActiveSection() {
        
        const accordion = this.template.querySelector('.example-accordion');

        if(this.currentSection == "Category") {
            
            if(this.category!=null && this.category.length!=0){
                
                this.categorySection.visible = false;
                this.categorySection.disabled = true;
                this.categorySection.icon = "action:approval";
                this.subCategorySection.visible = true;
                this.currentSection = "SubCategory";
            
            } else {
                
                this.template.querySelector('lightning-combobox[data-id=Category]').focus(); 
                this.template.querySelector('lightning-combobox[data-id=Category]').blur();
            
            }
            
        } else if(this.currentSection == "SubCategory") {
            
            if(this.subCategory!=null && this.subCategory.length!=0) {
                
                this.subCategorySection.visible = false;
                this.subCategorySection.disabled = true;
                this.subCategorySection.icon = "action:approval";    
                this.classIdSection.visible = true;
                this.currentSection =  "ClassId";
                
            } else {
                this.template.querySelector('lightning-combobox[data-id=SubCategory]').focus();
                this.template.querySelector('lightning-combobox[data-id=SubCategory]').blur();
            } 

        } else if(this.currentSection == "ClassId") {
                
                if(this.classId!=null && this.classId.length!=0) {
                    
                    this.isLoading = true;

                    validateClassId({classId: this.classId })
                        .then((result)=>{
                            if(result) {
                                this.classIdSection.visible = false;
                                this.classIdSection.disabled = true;
                                this.classIdSection.icon = "action:approval";
                                this.descriptionSection.visible = true;
                                this.currentSection = "Description";
                                
                            } else {

                                this.createToastMessages('Error', 'Please enter a valid Class / Async Service Id.', 'error');
                            }
                            this.isLoading = false;
                            
                        })
                        .catch((error)=>{

                            this.createToastMessages('Error', 'Oops ! There was an error while validating the Class / Async Service Id.', 'error');
                            this.template.querySelector('lightning-input[data-id=ClassId]').focus();
                            this.isLoading = false;

                        });
                
                } else {
                    
                    this.template.querySelector('lightning-input[data-id=ClassId]').focus();
                    this.template.querySelector('lightning-input[data-id=ClassId]').blur();
                    this.createToastMessages('Info', 'Please enter Class / Async Service Id.', 'info');
                }
        }      
    }

    hanldeDescriptionUpdate(event) {
        this.description = event.detail.value;
    }

    async handleSave() {
        if(this.description!=null && this.description.length!=0) {
            
            this.descriptionSection.icon = "action:approval";
            this.isLoading = true;

            const fields = {};
            
            fields[CASE_CATEGORY.fieldApiName] = this.category;
            fields[CASE_SUB_CATEGORY.fieldApiName] = this.subCategory;
            fields[CASE_SUBJECT.fieldApiName] = this.category +'-'+this.subCategory;
            fields[CASE_DESCRIPTION.fieldApiName] = this.description;
            fields[CASE_ACCOUNT.fieldApiName] = this.accountDetails.data.accountId;
            fields[CASE_TEACHER_CENTER.fieldApiName] = this.accountDetails.data.teacherCenter;
            //commented due to no record types in new env
            //fields[CASE_RECORD_TYPE.fieldApiName] = COMMUNITY_CASE_RECORD_TYPE_ID;
            fields[CASE_ORIGIN.fieldApiName] = 'Help Center';
            
            if(this.classIdRequired || (this.classId!=null && this.classId.length!=0)) {
                fields[CASE_CLASS_ID.fieldApiName] = this.classId;
            }
            
            try {
                const recordInput = { apiName: CASE.objectApiName, fields };
            
                const record = await createRecord(recordInput)
                if(record.id!=null && record.id!=undefined && record.id.length!=0) {
                    if(this.documents.length!=0) {
                        const isSuccessful = await this.saveDocuments(record.id);
                            if(isSuccessful) {
                                this.handleReset();
                                this[NavigationMixin.GenerateUrl]({
                                    type: 'standard__recordPage',
                                    attributes: {
                                        recordId: record.id,
                                        actionName: 'view',
                                    },
                                })
                                .then((url) => {
                                    const event = new ShowToastEvent({
                                        title: 'Success!',
                                        variant: 'success',
                                        mode: 'sticky',
                                        message: 'Record created successfully ! See it {0} .',
                                        messageData: [
                                            {
                                                url,
                                                label: record.fields.CaseNumber.value,
                                            },
                                        ],
                                    });
                                    this.dispatchEvent(event);
                                });
                        } else {
                            this.createToastMessages('Error', 'Case created but failed to upload supported document(s)', 'error');
                            
                        }
                        this.isLoading = false;
                    } else {
                        this.handleReset();
                        this.isLoading = false;
                        this[NavigationMixin.GenerateUrl]({
                            type: 'standard__recordPage',
                            attributes: {
                                recordId: record.id,
                                actionName: 'view',
                            },
                        })
                        .then((url) => {
                            const event = new ShowToastEvent({
                                title: 'Success!',
                                variant: 'success',
                                mode: 'sticky',
                                message: 'Record created successfully ! See it {0} .',
                                messageData: [
                                    {
                                        url,
                                        label: record.fields.CaseNumber.value,
                                    },
                                ],
                            });
                            this.dispatchEvent(event);
                        });    
                    }
                }
            }catch(error) {
                this.isLoading = false;
                this.createToastMessages('Error', error.body.message,'error')
            }
            
            
        } else {
            this.template.querySelector('lightning-textarea[data-id=Description]').focus();
            this.template.querySelector('lightning-textarea[data-id=Description]').blur();
        } 
    }

    handleReset() {
        this.subCategories = [];
        this.classIdRequired = false;
        this.currentSection = "Category";

        this.categorySection = { visible: true ,
                                 icon: "action:question_post_action" ,
                                 disabled: false
                            };

        this.subCategorySection = { visible: false ,
                                    icon: "action:question_post_action" ,
                                    disabled: false
                                };
        
        this.classIdSection = { visible: false ,
                                icon: "action:question_post_action" ,
                                disabled: false
                            };
        
        this.descriptionSection = { visible: false ,
                                    icon: "action:question_post_action" ,
                                    disabled: false
                                };

        this.classId = undefined;
        this.category = undefined;
        this.subCategory = undefined;
        this.description = undefined;
        this.documents = [];
    }

    handleSkip() {
        this.classIdSection.visible = false;
        this.classIdSection.disabled = true;
        this.classIdSection.icon = "action:approval";
        this.descriptionSection.visible = true;
        this.currentSection = "Description";
    }
}